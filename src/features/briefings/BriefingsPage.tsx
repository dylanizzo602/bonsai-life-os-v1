/* Briefings page: Multi-step morning briefing flow with progress bar */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTasks } from '../tasks/hooks/useTasks'
import { useReminders } from '../reminders/hooks/useReminders'
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
import { AddEditReminderModal } from '../reminders'
import type { Reminder } from '../reminders/types'
import type { InboxItem } from '../home/types'
import { useAuth } from '../auth/AuthContext'
import { useCalendarAgenda } from './hooks/useCalendarAgenda'
import { getDueStatus } from '../tasks/utils/date'
import { getAvailableTasksFromList } from '../tasks/utils/available'
import { habitReminderInstantForLocalDay } from '../../lib/supabase/reminders'

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
 * Briefing section: step-based morning briefing (greeting → overdue → plan day → 4 reflection questions → completion → overview).
 * Progress bar at bottom; each completed briefing is saved as a reflection entry.
 */
export function BriefingsPage({ onNavigateToReflections, onClose }: BriefingsPageProps) {
  /* Step state: 0 = greeting, 1 = overdue, 2 = plan day, 3–6 = reflection Q1–Q4, 7 = completion */
  const [step, setStep] = useState(0)
  /* After completion, user can view overview (saved entry); overview is a separate view */
  const [showOverview, setShowOverview] = useState(false)
  /* Reflection answers (in-memory until saved) */
  const [reflectionAnswers, setReflectionAnswers] = useState<MorningBriefingResponses>({})
  /* After saving, we have the entry id and title for overview */
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [savedEntryTitle, setSavedEntryTitle] = useState<string | null>(null)

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

  /* Tasks and reminders: fetch all top-level tasks and all reminders */
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
  const {
    reminders,
    loading: remindersLoading,
    refetch: refetchReminders,
    updateReminder,
    toggleComplete: toggleReminderComplete,
  } = useReminders()

  /* Habits: used to surface overdue habit reminders in the overdue step */
  const {
    habitsWithStreaks,
    todayYMD,
    setEntry: setHabitEntry,
    refetch: refetchHabits,
  } = useHabits()

  /* Inbox items: used for inbox review step to convert items into tasks or delete them */
  const {
    items: inboxItems,
    loading: inboxLoading,
    error: inboxError,
    deleteItem: deleteInboxItem,
  } = useInbox()

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

  /* Today start/end for filtering */
  const { todayStart, todayEnd } = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { todayStart: start.getTime(), todayEnd: end.getTime() }
  }, [])

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

  /* Overdue tasks and reminders (for step 1) */
  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.due_date &&
          !['completed', 'archived', 'deleted'].includes(t.status) &&
          getDueStatus(t.due_date) === 'overdue',
      ),
    [tasks],
  )
  const overdueReminders = useMemo(
    () =>
      reminders.filter(
        (r) =>
          !r.deleted &&
          !r.completed &&
          r.remind_at &&
          getDueStatus(r.remind_at) === 'overdue',
      ),
    [reminders],
  )

  /* Overdue habit reminders: habits with add_to_todos and a linked reminder/reminder_time whose occurrence is before today */
  const overdueHabitReminders = useMemo(
    () => {
      const items: { habit: HabitWithStreaks; remindAt: string | null }[] = habitsWithStreaks
        .filter((h) => h.add_to_todos && h.reminder_id)
        .map((habit) => {
          const linked = reminders.find((r) => r.id === habit.reminder_id!)
          const remindAt =
            linked?.remind_at ??
            (habit.reminder_time
              ? habitReminderInstantForLocalDay(todayYMD, habit.reminder_time)
              : null)
          return { habit, remindAt }
        })

      return items.filter(
        ({ remindAt }) =>
          !!remindAt && getDueStatus(remindAt) === 'overdue',
      )
    },
    [habitsWithStreaks, reminders, todayYMD],
  )

  /* Available tasks: use shared helper so semantics match Available view and Upcoming widgets */
  const availableTasks = useMemo(
    () => getAvailableTasksFromList(tasks, blockedTaskIds),
    [tasks, blockedTaskIds],
  )

  /* Edit task/reminder modals (used on overdue step and inbox review convert-to-task) */
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)
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
    if (savedEntryId) {
      setStep(8)
      return
    }
    const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    const entry = await saveOrUpdateMorningBriefingEntryForToday({
      title,
      responses: reflectionAnswers,
    })
    setSavedEntryId(entry.id)
    setSavedEntryTitle(entry.title ?? title)
    setStep(8)
  }, [reflectionAnswers, savedEntryId])

  /* View overview: show saved entry; create or update today's entry first so we never create duplicates */
  const handleViewOverview = useCallback(async () => {
    if (!savedEntryId && Object.keys(reflectionAnswers).length > 0) {
      const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
      const entry = await saveOrUpdateMorningBriefingEntryForToday({
        title,
        responses: reflectionAnswers,
      })
      setSavedEntryId(entry.id)
      setSavedEntryTitle(entry.title ?? title)
    }
    setShowOverview(true)
  }, [savedEntryId, reflectionAnswers])

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
          calendarEventCount={calendarEventCount}
          calendarLoading={calendarLoading}
          calendarError={calendarError}
          onBegin={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <OverdueScreen
          overdueTasks={overdueTasks}
          overdueReminders={overdueReminders}
          overdueHabitReminders={overdueHabitReminders}
          loading={tasksLoading || remindersLoading}
          onEditTask={openEditTask}
          onEditReminder={setEditReminder}
          onUpdateReminder={updateReminder}
          onToggleReminderComplete={toggleReminderComplete}
          onHabitMarkComplete={async (habit, remindAt) => {
            /* Mark habit occurrence complete; Supabase setEntry will advance the linked reminder when due on this date */
            const occurrenceDate = remindAt ? remindAt.slice(0, 10) : todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'completed')
            await refetchHabits()
            await refetchReminders()
          }}
          onHabitSkip={async (habit, remindAt) => {
            /* Mark habit occurrence skipped; still refresh reminders so overdue habit reminders list updates */
            const occurrenceDate = remindAt ? remindAt.slice(0, 10) : todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'skipped')
            await refetchHabits()
            await refetchReminders()
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
          onBack={goToPreviousStep}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <PlanDayScreen
          availableTasks={availableTasks}
          lineUpTaskIds={lineUpTaskIds}
           calendarEvents={calendarEventsToday}
           calendarLoading={calendarLoading}
           calendarError={calendarError}
          onAddToLineUp={addToLineUp}
          onRemoveFromLineUp={removeFromLineUp}
          onBack={goToPreviousStep}
          onNext={() => setStep(4)}
        />
      )}

      {step >= 4 && step <= 7 && (
        <ReflectionQuestionScreen
          question={REFLECTION_QUESTIONS[step - 4].label}
          value={reflectionAnswers[REFLECTION_QUESTIONS[step - 4].key] ?? ''}
          onChange={(value) =>
            setReflectionAnswers((prev) => ({
              ...prev,
              [REFLECTION_QUESTIONS[step - 4].key]: value,
            }))
          }
          onNext={() => {
            if (step === 7) saveEntryAndGoToCompletion()
            else setStep(step + 1)
          }}
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
          currentStep={step}
          totalSteps={TOTAL_STEPS}
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

      {/* Edit reminder modal (overdue step) */}
      {editReminder && (
        <AddEditReminderModal
          isOpen={true}
          onClose={() => {
            setEditReminder(null)
            refetchReminders()
          }}
          reminder={editReminder}
          onUpdateReminder={updateReminder}
          onRemindersChanged={refetchReminders}
        />
      )}
    </div>
  )
}
