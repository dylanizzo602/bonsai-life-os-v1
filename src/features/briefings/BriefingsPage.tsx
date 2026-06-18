/* Briefings page: Dynamic morning briefing flow with shared progress footer */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { useTasks } from '../tasks/hooks/useTasks'
import { useHabits } from '../habits/hooks/useHabits'
import { useInbox } from '../home/hooks/useInbox'
import { useGoals } from '../goals/hooks/useGoals'
import { getDependenciesForTaskIds } from '../../lib/supabase/tasks'
import {
  getMilestonesForGoal,
  getMilestoneCompletionsInRange,
  getTaskTreesByMilestoneId,
  updateMilestone,
  calculateGoalProgress,
} from '../../lib/supabase/goals'
import {
  saveOrUpdateMorningBriefingEntryForToday,
  getRandomReflectionEntryYearsAgoToday,
  getTodaysMorningBriefingEntry,
} from '../../lib/supabase/reflections'
import {
  loadTodaysLineupTaskIds,
  saveTodaysLineupTaskIds,
  hasLineupSeedRunToday,
  markLineupSeedRunToday,
} from '../../lib/todaysLineup'
import { buildTodaysLineupSeedTasks } from '../tasks/utils/partitionBonsaiTasks'
import type { Task } from '../tasks/types'
import type { MorningBriefingResponses } from '../reflections/types'
import type { ReflectionEntry } from '../reflections/types'
import type { HabitWithStreaks } from '../habits/types'
import type { GoalMilestone, UpdateMilestoneInput } from '../goals/types'
import { BriefingProgressFooter } from './components/BriefingProgressFooter'
import { BriefingSaveContinueButton } from './components/BriefingSaveContinueButton'
import { GreetingScreen } from './GreetingScreen'
import { YesterdayInReviewScreen } from './YesterdayInReviewScreen'
import { OverdueScreen } from './OverdueScreen'
import { ClearUndergrowthScreen } from './ClearUndergrowthScreen'
import { InboxReviewScreen } from './InboxReviewScreen'
import { PlanDayScreen, PlanDayFinishButton } from './PlanDayScreen'
import { GoalReviewScreen } from './GoalReviewScreen'
import { YesterdayHabitReviewScreen } from './YesterdayHabitReviewScreen'
import { MemorableMomentReflectionScreen } from './MemorableMomentReflectionScreen'
import { GratitudeReflectionScreen } from './GratitudeReflectionScreen'
import { CompletionScreen } from './CompletionScreen'
import { OverviewScreen } from './OverviewScreen'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import type { InboxItem } from '../home/types'
import { useAuth } from '../auth/AuthContext'
import { useCalendarAgenda } from './hooks/useCalendarAgenda'
import { useGoogleCalendarEventsToday } from './hooks/useGoogleCalendarEventsToday'
import { getDueStatus } from '../tasks/utils/date'
import { computeBlockedTaskIds } from '../tasks/utils/dependencies'
import { getAvailableTasksFromList } from '../tasks/utils/available'
import { isoInstantToLocalCalendarYMD } from '../../lib/localCalendarDate'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import {
  buildBriefingSteps,
  buildPreviewBriefingSteps,
  getBriefingPercentComplete,
  type BriefingStepId,
} from './types/briefingSteps'
import {
  isPreviewFixtureId,
  PREVIEW_GOAL,
  PREVIEW_HABIT_BREAKDOWN,
  PREVIEW_INBOX_ITEMS,
  PREVIEW_MILESTONES,
  PREVIEW_OVERDUE_HABIT_REMINDERS,
  PREVIEW_OVERDUE_TASKS,
  PREVIEW_UNDERGROWTH_TASKS,
  PREVIEW_YEARS_AGO_ENTRY,
} from './preview/briefingPreviewFixtures'
import {
  formatFirstMeetingSubtitle,
  getFirstTimedEventToday,
  getPriorityTasksDueTodayCount,
} from './utils/greetingSummary'
import { computeYesterdayReviewStats } from './utils/yesterdayReviewStats'
import { getYesterdayHabitBreakdown } from './utils/yesterdayHabitBreakdown'
import { getUndergrowthTasks } from './utils/undergrowthTasks'

export interface BriefingsPageProps {
  /** Preview mode: walk the flow without saving a reflection entry or lineup changes */
  previewMode?: boolean
  /** Continue today's session: start at greeting with saved responses prefilled */
  continueSession?: boolean
  /** Optional: navigate to Reflections section (e.g. from OverviewScreen) */
  onNavigateToReflections?: () => void
  /** Optional: close the briefing flow (e.g. navigate to home) */
  onClose?: () => void
}

/**
 * Morning briefing orchestrator: dynamic step sequence, shared progress footer, reflection save.
 */
export function BriefingsPage({
  previewMode = false,
  continueSession = false,
  onNavigateToReflections,
  onClose,
}: BriefingsPageProps) {
  /* User time zone: due dates and briefing completion align with Settings */
  const timeZone = useUserTimeZone()
  const { user } = useAuth()

  /* Profile fields for personalized greeting */
  const firstName =
    typeof user?.user_metadata?.first_name === 'string' ? user.user_metadata.first_name : null
  const location =
    typeof user?.user_metadata?.location === 'string' ? user.user_metadata.location : null

  /* Dynamic step index into the frozen step list */
  const [stepIndex, setStepIndex] = useState(0)
  const [frozenSteps, setFrozenSteps] = useState<BriefingStepId[] | null>(null)
  const didFreezeStepsRef = useRef(false)

  /* Overview view after completion */
  const [showOverview, setShowOverview] = useState(false)
  const [reflectionAnswers, setReflectionAnswers] = useState<MorningBriefingResponses>({})
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [savedEntryTitle, setSavedEntryTitle] = useState<string | null>(null)
  const [isSavingEntry, setIsSavingEntry] = useState(false)
  const [continueSessionLoading, setContinueSessionLoading] = useState(continueSession)

  /* Continue session: load today's saved responses and restart from greeting */
  useEffect(() => {
    if (!continueSession || previewMode) {
      setContinueSessionLoading(false)
      return
    }

    let cancelled = false
    setContinueSessionLoading(true)
    didFreezeStepsRef.current = false
    setFrozenSteps(null)
    setStepIndex(0)
    setShowOverview(false)

    getTodaysMorningBriefingEntry(timeZone)
      .then((entry) => {
        if (cancelled || !entry) return
        setReflectionAnswers((entry.responses ?? {}) as MorningBriefingResponses)
        setSavedEntryId(entry.id)
        setSavedEntryTitle(entry.title)
      })
      .finally(() => {
        if (!cancelled) setContinueSessionLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [continueSession, previewMode, timeZone])

  /* Years-ago entry for memorable moment step */
  const [yearsAgoEntry, setYearsAgoEntry] = useState<Awaited<
    ReturnType<typeof getRandomReflectionEntryYearsAgoToday>
  > | null>(previewMode ? PREVIEW_YEARS_AGO_ENTRY : null)
  const [yearsAgoLoading, setYearsAgoLoading] = useState(!previewMode)
  useEffect(() => {
    if (previewMode) {
      setYearsAgoEntry(PREVIEW_YEARS_AGO_ENTRY)
      setYearsAgoLoading(false)
      return
    }
    let cancelled = false
    setYearsAgoLoading(true)
    getRandomReflectionEntryYearsAgoToday({ timeZone })
      .then((result) => {
        if (!cancelled) setYearsAgoEntry(result)
      })
      .catch(() => {
        if (!cancelled) setYearsAgoEntry(null)
      })
      .finally(() => {
        if (!cancelled) setYearsAgoLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewMode, timeZone])

  /* Milestones completed yesterday for review stats */
  const [milestonesReachedYesterday, setMilestonesReachedYesterday] = useState(0)
  const [milestonesStatsLoading, setMilestonesStatsLoading] = useState(true)

  /* Today's lineup task ids (shared with Tasks section) */
  const [lineUpTaskIds, setLineUpTaskIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (previewMode) {
      setLineUpTaskIds(new Set())
      return
    }
    setLineUpTaskIds(loadTodaysLineupTaskIds())
  }, [previewMode, stepIndex])

  const addToLineUp = useCallback(
    (id: string) => {
      setLineUpTaskIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        if (!previewMode) saveTodaysLineupTaskIds(next)
        return next
      })
    },
    [previewMode],
  )

  /* Tasks hook */
  const {
    tasks,
    loading: tasksLoading,
    refetch: refetchTasks,
    createTask,
    updateTask,
    toggleComplete,
    fetchSubtasks,
    createSubtask,
    deleteTask,
    getTasks,
    getTaskDependencies,
    onAddDependency,
    onRemoveDependency,
  } = useTasks()

  /* Habits hook */
  const {
    habitsWithStreaks,
    entriesByHabit,
    setDateRange,
    todayYMD,
    setEntry: setHabitEntry,
    refetch: refetchHabits,
    loading: habitsLoading,
  } = useHabits()

  /* Goals hook (Sunday goal review) */
  const { goals, loading: goalsLoading, refetch: refetchGoals } = useGoals()
  const [milestonesByGoal, setMilestonesByGoal] = useState<Record<string, GoalMilestone[]>>({})
  const [taskTreesByMilestoneId, setTaskTreesByMilestoneId] = useState<Record<string, Task[]>>({})
  /** Carousel index for Sunday goal review (footer shows Next until the last goal) */
  const [goalReviewIndex, setGoalReviewIndex] = useState(0)

  /* Inbox hook */
  const {
    items: inboxItems,
    loading: inboxLoading,
    error: inboxError,
    deleteItem: deleteInboxItem,
  } = useInbox()

  /* Calendar day boundaries */
  const { todayStart, todayEnd, yesterdayYMD, isSunday } = useMemo(() => {
    const z = DateTime.now().setZone(timeZone)
    const yesterday = z.minus({ days: 1 })
    return {
      todayStart: z.startOf('day').toMillis(),
      todayEnd: z.endOf('day').toMillis(),
      yesterdayYMD: yesterday.toISODate() ?? z.toISODate() ?? todayYMD,
      isSunday: z.weekday === 7,
    }
  }, [timeZone, todayYMD])

  /* Include yesterday in habit date range once past greeting */
  useEffect(() => {
    if (stepIndex >= 1) {
      setDateRange({ start: yesterdayYMD, end: yesterdayYMD })
    }
  }, [stepIndex, setDateRange, yesterdayYMD])

  /* Fetch milestone completions for yesterday stats */
  useEffect(() => {
    const start = DateTime.fromISO(yesterdayYMD, { zone: timeZone }).startOf('day').toUTC().toISO()!
    const end = DateTime.fromISO(yesterdayYMD, { zone: timeZone })
      .plus({ days: 1 })
      .startOf('day')
      .toUTC()
      .toISO()!
    setMilestonesStatsLoading(true)
    getMilestoneCompletionsInRange(start, end)
      .then(setMilestonesReachedYesterday)
      .catch(() => setMilestonesReachedYesterday(0))
      .finally(() => setMilestonesStatsLoading(false))
  }, [yesterdayYMD, timeZone])

  /* Blocked task ids for available filter */
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (tasks.length === 0) {
      setBlockedTaskIds(new Set())
      return
    }
    const taskIds = tasks.map((t) => t.id)
    const taskLookup = Object.fromEntries(tasks.map((t) => [t.id, t]))
    getDependenciesForTaskIds(taskIds)
      .then((deps) => setBlockedTaskIds(computeBlockedTaskIds(deps, taskLookup)))
      .catch(() => setBlockedTaskIds(new Set()))
  }, [tasks])

  /* Calendar agenda sources */
  const calendarUrlsBySource = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
    let google =
      typeof metadata.calendar_ics_google === 'string' ? metadata.calendar_ics_google : ''
    let microsoft =
      typeof metadata.calendar_ics_microsoft === 'string' ? metadata.calendar_ics_microsoft : ''
    let apple = typeof metadata.calendar_ics_apple === 'string' ? metadata.calendar_ics_apple : ''

    if (typeof window !== 'undefined') {
      if (!google) google = window.localStorage.getItem('bonsai_calendar_ics_google') ?? ''
      if (!microsoft) microsoft = window.localStorage.getItem('bonsai_calendar_ics_microsoft') ?? ''
      if (!apple) apple = window.localStorage.getItem('bonsai_calendar_ics_apple') ?? ''
    }

    return { google, microsoft, apple }
  }, [user])

  const {
    loading: calendarLoading,
    error: calendarError,
    eventsToday: calendarEventsToday,
    countToday: calendarEventCount,
  } = useCalendarAgenda({ urlsBySource: calendarUrlsBySource })

  const {
    loading: googleCalendarLoading,
    connected: googleCalendarConnected,
    error: googleCalendarError,
    eventsToday: googleCalendarEventsToday,
    countToday: googleCalendarEventCount,
  } = useGoogleCalendarEventsToday()

  const effectiveCalendarLoading = googleCalendarConnected ? googleCalendarLoading : calendarLoading
  const effectiveCalendarError = googleCalendarConnected ? googleCalendarError : calendarError
  const effectiveCalendarEventsToday = googleCalendarConnected
    ? googleCalendarEventsToday
    : calendarEventsToday
  const effectiveCalendarEventCount = googleCalendarConnected
    ? googleCalendarEventCount
    : calendarEventCount

  const firstMeetingSubtitle = useMemo(
    () =>
      formatFirstMeetingSubtitle(
        getFirstTimedEventToday(effectiveCalendarEventsToday),
        effectiveCalendarEventsToday,
      ),
    [effectiveCalendarEventsToday],
  )

  const priorityTasksDueTodayCount = useMemo(
    () => getPriorityTasksDueTodayCount(tasks, todayStart, todayEnd),
    [tasks, todayStart, todayEnd],
  )

  const tasksDueTodayCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.due_date &&
          !['completed', 'archived', 'deleted'].includes(t.status) &&
          new Date(t.due_date).getTime() >= todayStart &&
          new Date(t.due_date).getTime() <= todayEnd,
      ).length,
    [tasks, todayStart, todayEnd],
  )

  /* Overdue tasks (non-habit-linked) */
  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.habit_id &&
          t.due_date &&
          !['completed', 'archived', 'deleted'].includes(t.status) &&
          getDueStatus(t.due_date, timeZone) === 'overdue',
      ),
    [tasks, timeZone],
  )

  /* Overdue habit reminders from yesterday */
  const overdueHabitReminders = useMemo(() => {
    const dueYMDInZone = (dueDate: string | null | undefined): string | null => {
      if (!dueDate) return null
      if (!dueDate.includes('T')) return dueDate
      const timeMatch = dueDate.match(/T(\d{2}):(\d{2})/)
      const hasExplicitTime = !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
      if (!hasExplicitTime) {
        const datePart = dueDate.slice(0, 10)
        return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null
      }
      const dt = DateTime.fromISO(dueDate, { setZone: true }).setZone(timeZone)
      return dt.isValid ? dt.toISODate() : null
    }

    return tasks
      .filter(
        (t) =>
          !!t.habit_id &&
          !!t.due_date &&
          !['completed', 'archived', 'deleted'].includes(t.status) &&
          dueYMDInZone(t.due_date) === yesterdayYMD,
      )
      .map((task) => {
        const habit = habitsWithStreaks.find((h) => h.id === task.habit_id)
        if (!habit) return null
        return { habit, task, remindAt: task.due_date }
      })
      .filter((x): x is { habit: HabitWithStreaks; task: Task; remindAt: string | null } => x != null)
  }, [habitsWithStreaks, tasks, timeZone, yesterdayYMD])

  const hasMissedItems = overdueTasks.length > 0 || overdueHabitReminders.length > 0

  const undergrowthTasks = useMemo(() => getUndergrowthTasks(tasks), [tasks])
  const activeGoals = useMemo(() => goals.filter((g) => g.is_active !== false), [goals])

  const habitBreakdown = useMemo(
    () => getYesterdayHabitBreakdown(habitsWithStreaks, entriesByHabit, yesterdayYMD),
    [entriesByHabit, habitsWithStreaks, yesterdayYMD],
  )

  const yesterdayReviewStats = useMemo(
    () =>
      computeYesterdayReviewStats(
        tasks,
        habitsWithStreaks,
        entriesByHabit,
        yesterdayYMD,
        timeZone,
        milestonesReachedYesterday,
      ),
    [
      entriesByHabit,
      habitsWithStreaks,
      milestonesReachedYesterday,
      tasks,
      timeZone,
      yesterdayYMD,
    ],
  )

  /* Step context: drives optional steps in live briefing (preview uses buildPreviewBriefingSteps) */
  const stepContext = useMemo(
    () => ({
      isSunday,
      hasMissedItems,
      hasUndergrowthTasks: undergrowthTasks.length > 0,
      hasInboxItems: !inboxLoading && !inboxError && inboxItems.length > 0,
      hasActiveGoals: activeGoals.length > 0,
      hasSkippedHabitsYesterday: habitBreakdown.skippedYesterday.length > 0,
    }),
    [
      activeGoals.length,
      habitBreakdown.skippedYesterday.length,
      hasMissedItems,
      inboxError,
      inboxItems.length,
      inboxLoading,
      isSunday,
      undergrowthTasks.length,
    ],
  )

  const dataReadyForFreeze = previewMode
    ? true
    : !tasksLoading && !habitsLoading && !inboxLoading && !goalsLoading && !milestonesStatsLoading

  useEffect(() => {
    if (didFreezeStepsRef.current || !dataReadyForFreeze) return
    didFreezeStepsRef.current = true
    setFrozenSteps(buildBriefingSteps(stepContext))
  }, [dataReadyForFreeze, stepContext])

  const steps = useMemo(
    () => (previewMode ? buildPreviewBriefingSteps() : frozenSteps ?? buildBriefingSteps(stepContext)),
    [previewMode, frozenSteps, stepContext],
  )
  const currentStepId: BriefingStepId = steps[stepIndex] ?? 'greeting'
  const percentComplete = getBriefingPercentComplete(currentStepId, stepIndex, steps.length)

  /* Preview fallbacks: show every screen even when the account has no matching data */
  const displayUndergrowthTasks =
    previewMode && undergrowthTasks.length === 0 ? PREVIEW_UNDERGROWTH_TASKS : undergrowthTasks
  const displayInboxItems =
    previewMode && inboxItems.length === 0 ? PREVIEW_INBOX_ITEMS : inboxItems
  const displayInboxLoading = previewMode && inboxItems.length === 0 ? false : inboxLoading
  const displayGoals =
    previewMode && activeGoals.length === 0 ? [PREVIEW_GOAL] : activeGoals
  const displayOverdueTasks =
    previewMode && overdueTasks.length === 0 ? PREVIEW_OVERDUE_TASKS : overdueTasks
  const displayOverdueHabitReminders =
    previewMode && overdueHabitReminders.length === 0
      ? PREVIEW_OVERDUE_HABIT_REMINDERS
      : overdueHabitReminders
  const displayHabitBreakdown =
    previewMode &&
    habitBreakdown.completed.length === 0 &&
    habitBreakdown.missed.length === 0
      ? PREVIEW_HABIT_BREAKDOWN
      : habitBreakdown

  const showYesterdayReview =
    currentStepId === 'reviewYesterday' ||
    (currentStepId === 'review' && !hasMissedItems)
  const showMissedItemsReview =
    currentStepId === 'reviewMissed' || (currentStepId === 'review' && hasMissedItems)

  const advanceStep = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }, [steps.length])

  /* Reset goal carousel when entering the goal review step */
  useEffect(() => {
    if (currentStepId === 'goalReview') {
      setGoalReviewIndex(0)
    }
  }, [currentStepId])

  /* Advance carousel or leave goal review once every goal has been shown */
  const handleGoalReviewContinue = useCallback(() => {
    const lastGoalIndex = Math.max(0, displayGoals.length - 1)
    if (goalReviewIndex < lastGoalIndex) {
      setGoalReviewIndex((i) => i + 1)
      return
    }
    setGoalReviewIndex(0)
    advanceStep()
  }, [advanceStep, displayGoals.length, goalReviewIndex])

  const goToPreviousStep = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  /** Back navigation for reflection steps (not on greeting) */
  const briefingGoBack = stepIndex > 0 ? goToPreviousStep : undefined

  /* Lineup seed when entering plan step */
  useEffect(() => {
    if (previewMode || currentStepId !== 'plan') return
    if (tasks.length === 0) return
    if (hasLineupSeedRunToday()) return

    const seedTasks = buildTodaysLineupSeedTasks(tasks, blockedTaskIds, timeZone, 5)
    markLineupSeedRunToday()
    if (seedTasks.length === 0) return

    const mergedIds = new Set([
      ...loadTodaysLineupTaskIds(),
      ...seedTasks.map((t) => t.id),
    ])
    setLineUpTaskIds(mergedIds)
    saveTodaysLineupTaskIds(mergedIds)
  }, [blockedTaskIds, currentStepId, previewMode, tasks, timeZone])

  /* Fetch milestones for Sunday goal review (or preview fixtures when no goals) */
  useEffect(() => {
    if (!steps.includes('goalReview')) return

    if (previewMode && activeGoals.length === 0) {
      setMilestonesByGoal({ [PREVIEW_GOAL.id]: PREVIEW_MILESTONES })
      setTaskTreesByMilestoneId({})
      return
    }

    if (activeGoals.length === 0) return

    const fetchMilestones = async () => {
      const map: Record<string, GoalMilestone[]> = {}
      const mergedTrees: Record<string, Task[]> = {}
      for (const goal of activeGoals) {
        try {
          const milestones = await getMilestonesForGoal(goal.id)
          map[goal.id] = milestones
          const trees = await getTaskTreesByMilestoneId(milestones)
          Object.assign(mergedTrees, trees)
        } catch {
          map[goal.id] = []
        }
      }
      setMilestonesByGoal(map)
      setTaskTreesByMilestoneId(mergedTrees)
    }

    void fetchMilestones()
  }, [activeGoals, previewMode, steps])

  const availableTasks = useMemo(
    () => getAvailableTasksFromList(tasks, blockedTaskIds, timeZone),
    [tasks, blockedTaskIds, timeZone],
  )

  const briefingAvailableTasks = useMemo(
    () => availableTasks.filter((t) => !t.habit_id),
    [availableTasks],
  )

  const lineupTasks = useMemo(
    () => tasks.filter((t) => lineUpTaskIds.has(t.id) && !t.habit_id),
    [lineUpTaskIds, tasks],
  )

  const backlogCandidates = useMemo(
    () => briefingAvailableTasks.filter((t) => !lineUpTaskIds.has(t.id)),
    [briefingAvailableTasks, lineUpTaskIds],
  )

  const goalsById = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g.name])),
    [goals],
  )

  /* Task modal state */
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [initialTitle, setInitialTitle] = useState('')
  const [inboxItemToRemoveOnCreate, setInboxItemToRemoveOnCreate] = useState<InboxItem | null>(null)

  const openEditTask = useCallback((task: Task) => {
    setEditTask(task)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
    setTaskModalOpen(true)
  }, [])

  const openConvertInboxItem = useCallback((item: InboxItem) => {
    setEditTask(null)
    setInitialTitle(item.name)
    setInboxItemToRemoveOnCreate(item)
    setTaskModalOpen(true)
  }, [])

  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false)
    setEditTask(null)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
  }, [])

  const handleCreateTask = useCallback(
    async (input: Parameters<typeof createTask>[0]) => {
      const created = await createTask(input)
      if (inboxItemToRemoveOnCreate) {
        await deleteInboxItem(inboxItemToRemoveOnCreate.id)
        setInboxItemToRemoveOnCreate(null)
      }
      await refetchTasks()
      closeTaskModal()
      return created
    },
    [createTask, inboxItemToRemoveOnCreate, deleteInboxItem, refetchTasks, closeTaskModal],
  )

  const handleUpdateTask = useCallback(
    async (id: string, input: Parameters<typeof updateTask>[1]) => {
      const updated = await updateTask(id, input)
      await refetchTasks()
      return updated
    },
    [updateTask, refetchTasks],
  )

  const handleDeleteUndergrowthTask = useCallback(
    async (task: Task) => {
      if (previewMode && isPreviewFixtureId(task.id)) return
      await deleteTask(task.id)
      await refetchTasks()
    },
    [deleteTask, previewMode, refetchTasks],
  )

  const handleToggleTaskComplete = useCallback(
    (taskId: string) => {
      if (previewMode && isPreviewFixtureId(taskId)) return
      void toggleComplete(taskId, true)
    },
    [previewMode, toggleComplete],
  )

  /* Goal milestone handlers for Sunday review */
  const refreshGoalMilestones = useCallback(async (goalId: string) => {
    const milestones = await getMilestonesForGoal(goalId)
    setMilestonesByGoal((prev) => ({ ...prev, [goalId]: milestones }))
    const trees = await getTaskTreesByMilestoneId(milestones)
    setTaskTreesByMilestoneId((prev) => ({ ...prev, ...trees }))
    await calculateGoalProgress(goalId)
    await refetchGoals()
  }, [refetchGoals])

  const handleBriefingUpdateMilestone = useCallback(
    async (milestoneId: string, input: UpdateMilestoneInput) => {
      if (previewMode && isPreviewFixtureId(milestoneId)) {
        let updated: GoalMilestone | null = null
        setMilestonesByGoal((prev) => {
          const next = { ...prev }
          for (const goalId of Object.keys(next)) {
            next[goalId] = next[goalId].map((m) => {
              if (m.id !== milestoneId) return m
              updated = { ...m, ...input }
              return updated
            })
          }
          return next
        })
        if (!updated) {
          throw new Error('Milestone not found')
        }
        return updated
      }

      const goalId = Object.entries(milestonesByGoal).find(([, list]) =>
        list.some((m) => m.id === milestoneId),
      )?.[0]
      const updated = await updateMilestone(milestoneId, input)
      if (goalId) await refreshGoalMilestones(goalId)
      return updated
    },
    [milestonesByGoal, previewMode, refreshGoalMilestones],
  )

  const briefingGetTasks = useCallback(async () => {
    const list = await getTasks()
    return list.map((t) => ({ id: t.id, title: t.title }))
  }, [getTasks])

  /* Persist reflection entry before completion (skipped in preview mode) */
  const saveEntryAndAdvance = useCallback(async () => {
    if (previewMode) {
      setSavedEntryTitle('Preview — Morning briefing')
      advanceStep()
      return
    }

    if (savedEntryId) {
      advanceStep()
      return
    }
    if (isSavingEntry) return

    try {
      setIsSavingEntry(true)
      const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
      const entry = await saveOrUpdateMorningBriefingEntryForToday(
        { title, responses: reflectionAnswers },
        timeZone,
      )
      setSavedEntryId(entry.id)
      setSavedEntryTitle(entry.title ?? title)
      advanceStep()
    } finally {
      setIsSavingEntry(false)
    }
  }, [advanceStep, isSavingEntry, previewMode, reflectionAnswers, savedEntryId, timeZone])

  const stepBeforeCompletion = steps[steps.length - 2]
  const isLastReflectionStep = currentStepId === stepBeforeCompletion

  const handleContinueFromReflection = useCallback(async () => {
    if (isLastReflectionStep) {
      await saveEntryAndAdvance()
    } else {
      advanceStep()
    }
  }, [advanceStep, isLastReflectionStep, saveEntryAndAdvance])

  const handleViewOverview = useCallback(async () => {
    if (isSavingEntry) return
    if (previewMode) {
      setSavedEntryTitle('Preview — Morning briefing')
      setShowOverview(true)
      return
    }
    if (!savedEntryId && Object.keys(reflectionAnswers).length > 0) {
      const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
      try {
        setIsSavingEntry(true)
        const entry = await saveOrUpdateMorningBriefingEntryForToday(
          { title, responses: reflectionAnswers },
          timeZone,
        )
        setSavedEntryId(entry.id)
        setSavedEntryTitle(entry.title ?? title)
      } finally {
        setIsSavingEntry(false)
      }
    }
    setShowOverview(true)
  }, [isSavingEntry, previewMode, reflectionAnswers, savedEntryId, timeZone])

  const handleBackToBriefing = useCallback(() => {
    setShowOverview(false)
  }, [])

  const handleReadYearsAgoEntry = useCallback(
    (_entry: ReflectionEntry) => {
      onNavigateToReflections?.()
    },
    [onNavigateToReflections],
  )

  /* Footer action slot by step */
  const footerAction = useMemo(() => {
    switch (currentStepId) {
      case 'undergrowth':
      case 'inbox':
      case 'goalReview':
        return (
          <BriefingSaveContinueButton
            onClick={handleGoalReviewContinue}
            label={
              goalReviewIndex < displayGoals.length - 1 ? 'Next' : 'Save & Continue'
            }
          />
        )
      case 'plan':
        return <PlanDayFinishButton onClick={advanceStep} />
      case 'habitReview':
        return (
          <BriefingSaveContinueButton
            onClick={advanceStep}
            label="Save & Continue"
          />
        )
      case 'memorableMoment':
      case 'gratitude':
        return (
          <BriefingSaveContinueButton
            onClick={() => void handleContinueFromReflection()}
            loading={isSavingEntry}
            disabled={isSavingEntry}
          />
        )
      default:
        return undefined
    }
  }, [
    advanceStep,
    currentStepId,
    displayGoals.length,
    goalReviewIndex,
    handleContinueFromReflection,
    handleGoalReviewContinue,
    isSavingEntry,
  ])

  const showProgressFooter = currentStepId !== 'greeting' && currentStepId !== 'completion'

  if (continueSessionLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-body text-on-surface-variant">Loading your briefing…</p>
      </div>
    )
  }

  /* Overview of saved responses */
  if (showOverview) {
    return (
      <div className="min-h-full">
        {previewMode ? (
          <div className="mb-4 rounded-lg border border-tertiary/30 bg-tertiary-container/40 px-4 py-2 text-center">
            <p className="text-secondary font-medium text-on-surface">
              Preview mode — not saved to your account
            </p>
          </div>
        ) : null}
        <h1 className="text-page-title mb-6 font-bold text-bonsai-brown-700">Briefing</h1>
        <OverviewScreen
          title={
            savedEntryTitle ??
            (previewMode
              ? 'Preview — Morning briefing'
              : `Morning briefing – ${new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`)
          }
          responses={reflectionAnswers}
          onBackToBriefing={handleBackToBriefing}
          onGoToReflections={previewMode ? undefined : onNavigateToReflections}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full flex flex-col">
      {previewMode ? (
        <div className="sticky top-20 z-30 border-b border-tertiary/30 bg-tertiary-container/40 px-4 py-2 text-center md:top-[4.5rem]">
          <p className="text-secondary font-medium text-on-surface">
            Preview mode — full briefing tour (all paths + Sunday steps). Nothing is saved to your
            account.
          </p>
        </div>
      ) : null}

      {currentStepId === 'greeting' && (
        <GreetingScreen
          firstName={firstName}
          location={location}
          tasksDueTodayCount={tasksDueTodayCount}
          priorityTasksDueTodayCount={priorityTasksDueTodayCount}
          calendarEventCount={effectiveCalendarEventCount}
          calendarLoading={effectiveCalendarLoading}
          calendarError={effectiveCalendarError}
          firstMeetingSubtitle={firstMeetingSubtitle}
          onBegin={advanceStep}
        />
      )}

      {showYesterdayReview ? (
        <YesterdayInReviewScreen
          firstName={firstName}
          stats={yesterdayReviewStats}
          loading={tasksLoading || habitsLoading || milestonesStatsLoading}
          onContinue={advanceStep}
        />
      ) : null}

      {showMissedItemsReview ? (
        <OverdueScreen
          overdueTasks={displayOverdueTasks}
          overdueHabitReminders={displayOverdueHabitReminders}
          loading={tasksLoading}
          onEditTask={(task) => {
            if (previewMode && isPreviewFixtureId(task.id)) return
            openEditTask(task)
          }}
          onToggleComplete={handleToggleTaskComplete}
          onHabitTargetComplete={async (habit, task, remindAt) => {
            if (previewMode && isPreviewFixtureId(habit.id)) return
            const occurrenceDate =
              isoInstantToLocalCalendarYMD(remindAt ?? task.due_date) ?? todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'completed')
            await refetchHabits()
            await refetchTasks()
          }}
          onHabitMinimum={async (habit, task, remindAt) => {
            if (previewMode && isPreviewFixtureId(habit.id)) return
            const occurrenceDate =
              isoInstantToLocalCalendarYMD(remindAt ?? task.due_date) ?? todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'minimum')
            await refetchHabits()
            await refetchTasks()
          }}
          onHabitSkip={async (habit, task, remindAt) => {
            if (previewMode && isPreviewFixtureId(habit.id)) return
            const occurrenceDate =
              isoInstantToLocalCalendarYMD(remindAt ?? task.due_date) ?? todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'skipped')
            await refetchHabits()
            await refetchTasks()
          }}
          onContinue={advanceStep}
        />
      ) : null}

      {currentStepId === 'undergrowth' && (
        <ClearUndergrowthScreen
          tasks={displayUndergrowthTasks}
          onDeleteTask={(task) => void handleDeleteUndergrowthTask(task)}
          onEditTask={(task) => {
            if (previewMode && isPreviewFixtureId(task.id)) return
            openEditTask(task)
          }}
        />
      )}

      {currentStepId === 'inbox' && (
        <InboxReviewScreen
          items={displayInboxItems}
          loading={displayInboxLoading}
          error={previewMode && inboxItems.length === 0 ? null : inboxError}
          onConvertToTask={openConvertInboxItem}
          onDeleteItem={async (id) => {
            if (previewMode && isPreviewFixtureId(id)) return
            await deleteInboxItem(id)
          }}
          onClose={onClose}
        />
      )}

      {currentStepId === 'plan' && (
        <PlanDayScreen
          lineupTasks={lineupTasks}
          backlogCandidates={backlogCandidates}
          goalsById={goalsById}
          calendarEvents={effectiveCalendarEventsToday}
          calendarLoading={effectiveCalendarLoading}
          calendarError={effectiveCalendarError}
          onAddToLineUp={addToLineUp}
          onEditTask={openEditTask}
          onToggleComplete={handleToggleTaskComplete}
          onClose={onClose}
        />
      )}

      {currentStepId === 'goalReview' && (
        <GoalReviewScreen
          goals={displayGoals}
          index={goalReviewIndex}
          onIndexChange={setGoalReviewIndex}
          milestonesByGoal={milestonesByGoal}
          taskTreesByMilestoneId={taskTreesByMilestoneId}
          onUpdateMilestone={handleBriefingUpdateMilestone}
          getTasks={briefingGetTasks}
          onOpenEditTaskModal={openEditTask}
          onClose={onClose}
        />
      )}

      {currentStepId === 'habitReview' && (
        <YesterdayHabitReviewScreen
          completed={displayHabitBreakdown.completed}
          missed={displayHabitBreakdown.missed}
          gotInTheWay={reflectionAnswers.habitsGotInTheWay ?? ''}
          doDifferentlyToday={reflectionAnswers.habitsDoDifferentlyToday ?? ''}
          onGotInTheWayChange={(value) =>
            setReflectionAnswers((prev) => ({ ...prev, habitsGotInTheWay: value }))
          }
          onDoDifferentlyChange={(value) =>
            setReflectionAnswers((prev) => ({ ...prev, habitsDoDifferentlyToday: value }))
          }
          onBack={briefingGoBack}
          onClose={onClose}
        />
      )}

      {currentStepId === 'memorableMoment' && (
        <MemorableMomentReflectionScreen
          value={reflectionAnswers.memorableMoment ?? ''}
          onChange={(value) =>
            setReflectionAnswers((prev) => ({ ...prev, memorableMoment: value }))
          }
          yearsAgoEntry={yearsAgoEntry}
          yearsAgoLoading={yearsAgoLoading}
          onReadYearsAgoEntry={handleReadYearsAgoEntry}
          onBack={briefingGoBack}
          onClose={onClose}
        />
      )}

      {currentStepId === 'gratitude' && (
        <GratitudeReflectionScreen
          value={reflectionAnswers.gratefulFor ?? ''}
          onChange={(value) =>
            setReflectionAnswers((prev) => ({ ...prev, gratefulFor: value }))
          }
          onBack={briefingGoBack}
          onClose={onClose}
        />
      )}

      {currentStepId === 'completion' && (
        <CompletionScreen onViewOverview={() => void handleViewOverview()} onClose={onClose} />
      )}

      {showProgressFooter ? (
        <BriefingProgressFooter percentComplete={percentComplete} action={footerAction} />
      ) : null}

      <AddEditTaskModal
        isOpen={taskModalOpen}
        onClose={closeTaskModal}
        task={editTask}
        initialTitle={initialTitle}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        updateTask={updateTask}
        deleteTask={deleteTask}
        toggleComplete={toggleComplete}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
      />
    </div>
  )
}
