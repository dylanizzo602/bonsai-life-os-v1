/* Briefings page: Multi-step morning briefing flow with progress bar */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { useTasks } from '../tasks/hooks/useTasks'
import { useHabits } from '../habits/hooks/useHabits'
import { useInbox } from '../home/hooks/useInbox'
import { getDependenciesForTaskIds } from '../../lib/supabase/tasks'
import { saveOrUpdateMorningBriefingEntryForToday } from '../../lib/supabase/reflections'
import {
  loadTodaysLineupTaskIds,
  saveTodaysLineupTaskIds,
} from '../../lib/todaysLineup'
import type { Task } from '../tasks/types'
import type { MorningBriefingResponses } from '../reflections/types'
import type { HabitWithStreaks } from '../habits/types'
import { BriefingProgressBar } from './BriefingProgressBar'
import { GreetingScreen } from './GreetingScreen'
import { OverdueScreen } from './OverdueScreen'
import { InboxReviewScreen } from './InboxReviewScreen'
import { PlanDayScreen } from './PlanDayScreen'
import { ReflectionQuestionScreen } from './ReflectionQuestionScreen'
import { CompletionScreen } from './CompletionScreen'
import { OverviewScreen } from './OverviewScreen'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import type { InboxItem } from '../home/types'
import { useAuth } from '../auth/AuthContext'
import { useCalendarAgenda } from './hooks/useCalendarAgenda'
import { useGoogleCalendarEventsToday } from './hooks/useGoogleCalendarEventsToday'
import { getDueStatus } from '../tasks/utils/date'
import { getAvailableTasksFromList } from '../tasks/utils/available'
import { isoInstantToLocalCalendarYMD } from '../../lib/localCalendarDate'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import { AddEditHabitModal } from '../habits/AddEditHabitModal'
import { isSelectedWeekday } from '../../lib/streaks'
import { getRandomReflectionEntryYearsAgoToday } from '../../lib/supabase/reflections'

/** Total steps in the flow (greeting + overdue + inbox review + plan + 4 reflection + completion) */
const TOTAL_STEPS = 9

/** Reflection question keys and labels (one per step 3–6; failures list and week-in-a-life removed) */
const REFLECTION_QUESTIONS: { key: keyof MorningBriefingResponses; label: string }[] = [
  { key: 'memorableMoment', label: 'What is one memorable moment from yesterday?' },
  { key: 'gratefulFor', label: 'What is something you are grateful for?' },
  { key: 'didEverything', label: 'Did you do everything you were supposed to yesterday? If not, why?' },
  { key: 'whatWouldMakeEasier', label: 'What would make today easier?' },
]

export interface BriefingsPageProps {
  /** Optional: navigate to Reflections section (e.g. from OverviewScreen) */
  onNavigateToReflections?: () => void
  /** Optional: close the briefing flow (e.g. navigate to home); when provided, CompletionScreen shows Close button */
  onClose?: () => void
}

/**
 * Briefing section: step-based morning briefing (greeting → overdue → inbox → plan day → 4 reflection questions → completion → overview).
 * Progress bar at bottom; each completed briefing is saved as a reflection entry.
 */
export function BriefingsPage({ onNavigateToReflections, onClose }: BriefingsPageProps) {
  /* User time zone: overdue step uses same due semantics as Tasks */
  const timeZone = useUserTimeZone()
  /* Step state: 0 = greeting, 1 = overdue, 2 = inbox, 3 = plan day, 4–7 = reflection Q1–Q4, 8 = completion */
  const [step, setStep] = useState(0)
  /* After completion, user can view overview (saved entry); overview is a separate view */
  const [showOverview, setShowOverview] = useState(false)
  /* Reflection answers (in-memory until saved) */
  const [reflectionAnswers, setReflectionAnswers] = useState<MorningBriefingResponses>({})
  /* After saving, we have the entry id and title for overview */
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [savedEntryTitle, setSavedEntryTitle] = useState<string | null>(null)
  /* Save guard: prevent double-submit races that can create duplicate morning briefings */
  const [isSavingEntry, setIsSavingEntry] = useState(false)

  /* Years ago today: optional random entry shown on the greeting step */
  const [yearsAgoEntry, setYearsAgoEntry] = useState<Awaited<
    ReturnType<typeof getRandomReflectionEntryYearsAgoToday>
  > | null>(null)
  useEffect(() => {
    let cancelled = false
    getRandomReflectionEntryYearsAgoToday()
      .then((result) => {
        if (!cancelled) setYearsAgoEntry(result)
      })
      .catch(() => {
        if (!cancelled) setYearsAgoEntry(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* Today's Lineup: date-scoped, shared with Tasks section */
  const [lineUpTaskIds, setLineUpTaskIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setLineUpTaskIds(loadTodaysLineupTaskIds())
  }, [step])

  const addToLineUp = useCallback((id: string) => {
    setLineUpTaskIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveTodaysLineupTaskIds(next)
      return next
    })
  }, [])
  const removeFromLineUp = useCallback((id: string) => {
    setLineUpTaskIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      saveTodaysLineupTaskIds(next)
      return next
    })
  }, [])

  /* Auth: current user for calendar settings (ICS URLs stored in user metadata) */
  const { user } = useAuth()

  /* Tasks: fetch all top-level tasks */
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

  /* Habits: overdue step + "did everything" reflection step (reuse HabitsPage card grid UI) */
  const {
    habitsWithStreaks,
    entriesByHabit,
    setDateRange,
    todayYMD,
    setEntry: setHabitEntry,
    refetch: refetchHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    loading: habitsLoading,
  } = useHabits()

  /* Habit edit modal: opened from HabitGrid settings button on the did-everything step */
  const [habitBeingEdited, setHabitBeingEdited] = useState<HabitWithStreaks | null>(null)

  /* Yesterday YMD (local calendar day): used for the habits "accountability" reflection skip logic */
  const yesterdayYMD = useMemo(() => {
    return DateTime.fromISO(todayYMD, { zone: timeZone }).minus({ days: 1 }).toISODate() ?? todayYMD
  }, [timeZone, todayYMD])

  /* Accountability skip: true when every scheduled habit is marked Target (completed) for yesterday */
  const allHabitsTargetYesterday = useMemo(() => {
    /* No habits: keep reflections visible (avoid skipping the user's prompts unexpectedly) */
    if (habitsWithStreaks.length === 0) return false

    /* Determine which habits were actually scheduled yesterday (weekly bitmask habits may be off-day) */
    const scheduledYesterday = habitsWithStreaks.filter((habit) => {
      const isWeekly =
        habit.frequency === 'weekly' &&
        typeof habit.frequency_target === 'number' &&
        habit.frequency_target >= 1 &&
        habit.frequency_target <= 127
      return !isWeekly || isSelectedWeekday(yesterdayYMD, habit.frequency_target ?? 0)
    })

    /* If nothing was scheduled yesterday, don't skip the reflection prompts */
    if (scheduledYesterday.length === 0) return false

    /* "Target" in the UI maps to entry status "completed" */
    return scheduledYesterday.every((habit) => {
      const entries = entriesByHabit[habit.id] ?? []
      const e = entries.find((x) => x.entry_date === yesterdayYMD)
      return e?.status === 'completed'
    })
  }, [entriesByHabit, habitsWithStreaks, yesterdayYMD])

  /* Habits grid step: show yesterday as a single-day view (matches the Habits card grid) */
  useEffect(() => {
    /* We set this starting at step 5 so yesterday entries are already in-range when the skip condition is evaluated */
    if (step >= 5 && step <= 7) {
      setDateRange({ start: yesterdayYMD, end: yesterdayYMD })
    }
  }, [step, setDateRange, yesterdayYMD])

  /* Close habit modal and refresh streak data after edits */
  const closeHabitEditModal = useCallback(() => {
    setHabitBeingEdited(null)
    void refetchHabits()
  }, [refetchHabits])

  /* Inbox items: used for inbox review step to convert items into tasks or delete them */
  const {
    items: inboxItems,
    loading: inboxLoading,
    error: inboxError,
    deleteItem: deleteInboxItem,
  } = useInbox()

  /* Inbox skip: when there are no inbox items, omit the inbox review step entirely */
  const shouldSkipInboxStep = useMemo(() => {
    return !inboxLoading && !inboxError && inboxItems.length === 0
  }, [inboxError, inboxItems.length, inboxLoading])

  /* Step guard: if the user reaches inbox step with an empty inbox, automatically advance to planning */
  useEffect(() => {
    if (step === 2 && shouldSkipInboxStep) {
      setStep(3)
    }
  }, [shouldSkipInboxStep, step])

  /* Blocked/blocking task IDs for "available" filter */
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (tasks.length === 0) {
      setBlockedTaskIds(new Set())
      return
    }
    const taskIds = tasks.map((t) => t.id)
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]))
    getDependenciesForTaskIds(taskIds)
      .then((deps) => {
        const blocked = new Set<string>()
        for (const d of deps) {
          const blocker = byId[d.blocker_id]
          if (blocker && blocker.status !== 'completed') blocked.add(d.blocked_id)
        }
        setBlockedTaskIds(blocked)
      })
      .catch(() => setBlockedTaskIds(new Set()))
  }, [tasks])

  /* Today start/end for filtering (same IANA zone as Settings / task list) */
  const { todayStart, todayEnd } = useMemo(() => {
    const z = DateTime.now().setZone(timeZone)
    return {
      todayStart: z.startOf('day').toMillis(),
      todayEnd: z.endOf('day').toMillis(),
    }
  }, [timeZone])

  /* Tasks due today (count for greeting) */
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

  /* Calendar agenda: aggregate today events across configured ICS URLs from user metadata or localStorage */
  const calendarUrlsBySource = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
    let google =
      typeof metadata.calendar_ics_google === 'string' ? metadata.calendar_ics_google : ''
    let microsoft =
      typeof metadata.calendar_ics_microsoft === 'string' ? metadata.calendar_ics_microsoft : ''
    let apple =
      typeof metadata.calendar_ics_apple === 'string' ? metadata.calendar_ics_apple : ''

    if (typeof window !== 'undefined') {
      if (!google) {
        google = window.localStorage.getItem('bonsai_calendar_ics_google') ?? ''
      }
      if (!microsoft) {
        microsoft = window.localStorage.getItem('bonsai_calendar_ics_microsoft') ?? ''
      }
      if (!apple) {
        apple = window.localStorage.getItem('bonsai_calendar_ics_apple') ?? ''
      }
    }

    return {
      google,
      microsoft,
      apple,
    }
  }, [user])

  const {
    loading: calendarLoading,
    error: calendarError,
    eventsToday: calendarEventsToday,
    countToday: calendarEventCount,
  } = useCalendarAgenda({ urlsBySource: calendarUrlsBySource })

  /* Google Calendar (OAuth): preferred source for today's agenda when connected */
  const {
    loading: googleCalendarLoading,
    connected: googleCalendarConnected,
    error: googleCalendarError,
    eventsToday: googleCalendarEventsToday,
    countToday: googleCalendarEventCount,
  } = useGoogleCalendarEventsToday()

  /* Calendar source selection: prefer Google OAuth when connected, fallback to ICS links */
  const effectiveCalendarLoading = googleCalendarConnected ? googleCalendarLoading : calendarLoading
  const effectiveCalendarError = googleCalendarConnected ? googleCalendarError : calendarError
  const effectiveCalendarEventsToday = googleCalendarConnected ? googleCalendarEventsToday : calendarEventsToday
  const effectiveCalendarEventCount = googleCalendarConnected ? googleCalendarEventCount : calendarEventCount

  /* Overdue tasks (exclude habit-linked rows — those use overdue habit list) */
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

  /* Overdue linked habit tasks */
  const overdueHabitReminders = useMemo(() => {
    /* Due-date normalization: interpret task.due_date as a calendar day in the user's time zone */
    const dueYMDInZone = (dueDate: string | null | undefined): string | null => {
      if (!dueDate) return null

      /* Date-only due dates are already a civil YYYY-MM-DD in the user's zone */
      if (!dueDate.includes('T')) return dueDate

      /* Legacy / date-only encoded as midnight ISO: treat as the date-part only (avoid zone shifting) */
      const timeMatch = dueDate.match(/T(\d{2}):(\d{2})/)
      const hasExplicitTime = !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
      if (!hasExplicitTime) {
        const datePart = dueDate.slice(0, 10)
        return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null
      }

      /* Timed due dates: convert the instant into the user's zone then take the local calendar day */
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

  /* Overdue skip: when there is nothing overdue to review, omit this step entirely */
  const shouldSkipOverdueStep = useMemo(() => {
    return !tasksLoading && overdueTasks.length === 0 && overdueHabitReminders.length === 0
  }, [overdueHabitReminders.length, overdueTasks.length, tasksLoading])

  /* Step guard: if the user reaches overdue step with nothing to review, automatically advance */
  useEffect(() => {
    if (step === 1 && shouldSkipOverdueStep) {
      setStep(2)
    }
  }, [shouldSkipOverdueStep, step])

  /* Available tasks: use shared helper so semantics match Available view and Upcoming widgets */
  const availableTasks = useMemo(
    () => getAvailableTasksFromList(tasks, blockedTaskIds, timeZone),
    [tasks, blockedTaskIds, timeZone],
  )

  /* Briefing-only filter: Today's Lineup picker should not include habit-linked reminder tasks */
  const briefingAvailableTasks = useMemo(
    () => availableTasks.filter((t) => !t.habit_id),
    [availableTasks],
  )

  /* Edit task modal (used on overdue step and inbox review convert-to-task) */
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [initialTitle, setInitialTitle] = useState<string>('')
  const [inboxItemToRemoveOnCreate, setInboxItemToRemoveOnCreate] = useState<InboxItem | null>(
    null,
  )

  /* Open task modal for editing an existing task (from overdue step) */
  const openEditTask = useCallback((task: Task) => {
    setEditTask(task)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
    setTaskModalOpen(true)
  }, [])

  /* Open task modal to convert an inbox item into a new task (from inbox review step) */
  const openConvertInboxItem = useCallback((item: InboxItem) => {
    setEditTask(null)
    setInitialTitle(item.name)
    setInboxItemToRemoveOnCreate(item)
    setTaskModalOpen(true)
  }, [])

  /* Close task modal and reset related state */
  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false)
    setEditTask(null)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
  }, [])

  /* Create task handler: used when converting an inbox item; deletes inbox item after successful create */
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

  /* Update task handler: refresh tasks after updating from the overdue step */
  const handleUpdateTask = useCallback(
    async (id: string, input: Parameters<typeof updateTask>[1]) => {
      const updated = await updateTask(id, input)
      await refetchTasks()
      return updated
    },
    [updateTask, refetchTasks],
  )

  /* Save reflection entry once when moving to completion (step 6); use shared helper so only one entry exists per day */
  const saveEntryAndGoToCompletion = useCallback(async () => {
    if (savedEntryId || isSavingEntry) {
      setStep(8)
      return
    }
    try {
      setIsSavingEntry(true)
      const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      const entry = await saveOrUpdateMorningBriefingEntryForToday(
        {
          title,
          responses: reflectionAnswers,
        },
        timeZone,
      )
      setSavedEntryId(entry.id)
      setSavedEntryTitle(entry.title ?? title)
      setStep(8)
    } finally {
      setIsSavingEntry(false)
    }
  }, [isSavingEntry, reflectionAnswers, savedEntryId, timeZone])

  /* Progress bar: adjust total/current when accountability questions are skipped */
  const effectiveTotalSteps =
    TOTAL_STEPS -
    (allHabitsTargetYesterday ? 2 : 0) -
    (shouldSkipInboxStep ? 1 : 0) -
    (shouldSkipOverdueStep ? 1 : 0)
  const effectiveCurrentStep = useMemo(() => {
    /* Step offset: account for optional step skips so progress stays accurate */
    const overdueOffset = shouldSkipOverdueStep && step >= 2 ? 1 : 0
    const inboxOffset = shouldSkipInboxStep && step >= 3 ? 1 : 0
    const habitsOffset = allHabitsTargetYesterday && step >= 8 ? 2 : 0
    return step - overdueOffset - inboxOffset - habitsOffset
  }, [allHabitsTargetYesterday, shouldSkipInboxStep, shouldSkipOverdueStep, step])

  /* View overview: show saved entry; create or update today's entry first so we never create duplicates */
  const handleViewOverview = useCallback(async () => {
    if (isSavingEntry) return
    if (!savedEntryId && Object.keys(reflectionAnswers).length > 0) {
      const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
      try {
        setIsSavingEntry(true)
        const entry = await saveOrUpdateMorningBriefingEntryForToday(
          {
            title,
            responses: reflectionAnswers,
          },
          timeZone,
        )
        setSavedEntryId(entry.id)
        setSavedEntryTitle(entry.title ?? title)
      } finally {
        setIsSavingEntry(false)
      }
    }
    setShowOverview(true)
  }, [isSavingEntry, savedEntryId, reflectionAnswers, timeZone])

  /* Back from overview to completion step */
  const handleBackToBriefing = useCallback(() => {
    setShowOverview(false)
  }, [])

  /* Go back to the previous briefing step (not used on greeting) */
  const goToPreviousStep = useCallback(() => {
    setStep((prev) => (prev > 0 ? prev - 1 : 0))
  }, [])

  /* Render overview when user clicked "View overview" */
  if (showOverview) {
    return (
      <div className="min-h-full">
        <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Briefing</h1>
        <OverviewScreen
          title={savedEntryTitle ?? `Morning briefing – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          responses={reflectionAnswers}
          onBackToBriefing={handleBackToBriefing}
          onGoToReflections={onNavigateToReflections}
        />
      </div>
    )
  }

  /* Main flow: step 0–7 with progress bar */
  return (
    <div className="min-h-full flex flex-col">
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Briefing</h1>

      {step === 0 && (
        <GreetingScreen
          tasksDueTodayCount={tasksDueTodayCount}
          calendarEventCount={effectiveCalendarEventCount}
          calendarLoading={effectiveCalendarLoading}
          calendarError={effectiveCalendarError}
          yearsAgoEntry={yearsAgoEntry}
          onBegin={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <OverdueScreen
          overdueTasks={overdueTasks}
          overdueHabitReminders={overdueHabitReminders}
          loading={tasksLoading}
          onEditTask={openEditTask}
          onHabitTargetComplete={async (habit, task, remindAt) => {
            const occurrenceDate =
              isoInstantToLocalCalendarYMD(remindAt ?? task.due_date) ?? todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'completed')
            await refetchHabits()
            await refetchTasks()
          }}
          onHabitMinimum={async (habit, task, remindAt) => {
            const occurrenceDate =
              isoInstantToLocalCalendarYMD(remindAt ?? task.due_date) ?? todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'minimum')
            await refetchHabits()
            await refetchTasks()
          }}
          onHabitSkip={async (habit, task, remindAt) => {
            const occurrenceDate =
              isoInstantToLocalCalendarYMD(remindAt ?? task.due_date) ?? todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'skipped')
            await refetchHabits()
            await refetchTasks()
          }}
          onBack={goToPreviousStep}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <InboxReviewScreen
          items={inboxItems}
          loading={inboxLoading}
          error={inboxError}
          onConvertToTask={openConvertInboxItem}
          onDeleteItem={deleteInboxItem}
          onBack={() => setStep(shouldSkipOverdueStep ? 0 : 1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <PlanDayScreen
          availableTasks={briefingAvailableTasks}
          lineUpTaskIds={lineUpTaskIds}
          calendarEvents={effectiveCalendarEventsToday}
          calendarLoading={effectiveCalendarLoading}
          calendarError={effectiveCalendarError}
          onEditTask={openEditTask}
          onAddToLineUp={addToLineUp}
          onRemoveFromLineUp={removeFromLineUp}
          onBack={() => {
            /* Back navigation: account for optional step skips (inbox + overdue) */
            if (!shouldSkipInboxStep) {
              setStep(2)
              return
            }
            if (!shouldSkipOverdueStep) {
              setStep(1)
              return
            }
            setStep(0)
          }}
          onNext={() => setStep(4)}
        />
      )}

      {step >= 4 && step <= 7 && (
        <ReflectionQuestionScreen
          aboveQuestion={
            step === 6
              ? habitsLoading
                ? (
                    <p className="text-body text-bonsai-slate-500">Loading habits…</p>
                  )
                : habitsWithStreaks.length === 0
                  ? (
                      <p className="text-secondary text-bonsai-slate-600">
                        No habits yet. Add habits in the Habits section to track them here.
                      </p>
                    )
                  : (
                      <div className="w-full">
                        {/* Habit accountability summary: show only habits marked "skipped" yesterday (text-only) */}
                        {(() => {
                          const skipped = habitsWithStreaks
                            .map((habit) => {
                              const entries = entriesByHabit[habit.id] ?? []
                              const entry = entries.find((x) => x.entry_date === yesterdayYMD)
                              return entry?.status === 'skipped' ? habit : null
                            })
                            .filter((h): h is HabitWithStreaks => h != null)

                          return skipped.length === 0 ? (
                            <p className="text-secondary text-bonsai-slate-600">
                              No habits were marked as skipped yesterday.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-secondary font-medium text-bonsai-slate-700">
                                Habits you skipped yesterday:
                              </p>
                              <ul className="list-disc pl-5 text-body text-bonsai-slate-800">
                                {skipped.map((habit) => (
                                  <li key={habit.id}>{habit.name}</li>
                                ))}
                              </ul>
                            </div>
                          )
                        })()}
                      </div>
                    )
              : undefined
          }
          question={REFLECTION_QUESTIONS[step - 4].label}
          value={reflectionAnswers[REFLECTION_QUESTIONS[step - 4].key] ?? ''}
          onChange={(value) =>
            setReflectionAnswers((prev) => ({
              ...prev,
              [REFLECTION_QUESTIONS[step - 4].key]: value,
            }))
          }
          onNext={() => {
            /* Skip accountability questions when yesterday's scheduled habits are all marked Target */
            if (allHabitsTargetYesterday && step === 5) {
              saveEntryAndGoToCompletion()
              return
            }

            if (step === 7) saveEntryAndGoToCompletion()
            else setStep(step + 1)
          }}
          isNextDisabled={isSavingEntry}
          isNextLoading={isSavingEntry}
          onBack={step > 4 ? goToPreviousStep : undefined}
          showBack={step > 4}
        />
      )}

      {step === 8 && (
        <CompletionScreen onViewOverview={handleViewOverview} onClose={onClose} />
      )}

      {/* Progress bar: show for steps 1–8 (not greeting); total 9 steps */}
      {step >= 1 && step <= 8 && (
        <BriefingProgressBar
          currentStep={effectiveCurrentStep}
          totalSteps={effectiveTotalSteps}
        />
      )}

      {/* Add/Edit task modal (overdue step edit and inbox convert-to-task) */}
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

      {/* Edit habit from briefing habit table (did-everything step) */}
      <AddEditHabitModal
        isOpen={habitBeingEdited !== null}
        onClose={closeHabitEditModal}
        habit={habitBeingEdited}
        onCreateHabit={createHabit}
        onUpdateHabit={updateHabit}
        onDeleteHabit={deleteHabit}
      />
    </div>
  )
}
