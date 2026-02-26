/* Briefings page: Multi-step morning briefing flow with progress bar */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTasks } from '../tasks/hooks/useTasks'
import { useReminders } from '../reminders/hooks/useReminders'
import { useHabits } from '../habits/hooks/useHabits'
import { getDependenciesForTaskIds } from '../../lib/supabase/tasks'
import { createReflectionEntry } from '../../lib/supabase/reflections'
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
import { PlanDayScreen } from './PlanDayScreen'
import { ReflectionQuestionScreen } from './ReflectionQuestionScreen'
import { CompletionScreen } from './CompletionScreen'
import { OverviewScreen } from './OverviewScreen'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import { AddEditReminderModal } from '../reminders'
import type { Reminder } from '../reminders/types'

/** Total steps in the flow (greeting + overdue + plan + 4 reflection + completion) */
const TOTAL_STEPS = 8

/** Reflection question keys and labels (one per step 3–6) */
const REFLECTION_QUESTIONS: { key: keyof MorningBriefingResponses; label: string }[] = [
  { key: 'memorableMoment', label: 'What is one memorable moment from yesterday?' },
  { key: 'gratefulFor', label: 'What is something you are grateful for?' },
  { key: 'didEverything', label: 'Did you do everything you were supposed to yesterday? If not, why?' },
  { key: 'whatWouldMakeEasier', label: 'What would make today easier?' },
]

/** Priority order for sorting available tasks (urgent first, then due, etc.) */
const PRIORITY_ORDER: Record<Task['priority'], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

export interface BriefingsPageProps {
  /** Optional: navigate to Reflections section (e.g. from OverviewScreen) */
  onNavigateToReflections?: () => void
}

/**
 * Briefing section: step-based morning briefing (greeting → overdue → plan day → 4 reflection questions → completion → overview).
 * Progress bar at bottom; each completed briefing is saved as a reflection entry.
 */
export function BriefingsPage({ onNavigateToReflections }: BriefingsPageProps) {
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

  /* Tasks and reminders: fetch all top-level tasks and all reminders */
  const {
    tasks,
    loading: tasksLoading,
    refetch: refetchTasks,
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
    advanceToNextOccurrence: advanceReminderToNextOccurrence,
  } = useReminders()

  /* Habits: used to surface overdue habit reminders in the overdue step */
  const {
    habitsWithStreaks,
    todayYMD,
    setEntry: setHabitEntry,
    refetch: refetchHabits,
  } = useHabits()

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

  /* Overdue tasks and reminders (for step 1) */
  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.due_date &&
          !['completed', 'archived', 'deleted'].includes(t.status) &&
          new Date(t.due_date).getTime() < todayStart,
      ),
    [tasks, todayStart],
  )
  const overdueReminders = useMemo(
    () =>
      reminders.filter(
        (r) =>
          !r.deleted &&
          !r.completed &&
          r.remind_at &&
          new Date(r.remind_at).getTime() < todayStart,
      ),
    [reminders, todayStart],
  )

  /* Overdue habit reminders: habits with add_to_todos and a linked reminder/reminder_time whose occurrence is before today */
  const overdueHabitReminders = useMemo(
    () => {
      const items: { habit: HabitWithStreaks; remindAt: string | null }[] =
        habitsWithStreaks
          .filter((h) => h.add_to_todos && h.reminder_id)
          .map((habit) => {
            const linked = reminders.find((r) => r.id === habit.reminder_id!)
            const remindAt =
              linked?.remind_at ??
              (habit.reminder_time ? `${todayYMD}T${habit.reminder_time}` : null)
            return { habit, remindAt }
          })

      return items.filter(
        ({ remindAt }) =>
          !!remindAt && new Date(remindAt).getTime() < todayStart,
      )
    },
    [habitsWithStreaks, reminders, todayYMD, todayStart],
  )

  /* Available tasks (first 5): not completed/archived/deleted, not blocked, start <= now */
  const availableTasks = useMemo(() => {
    const now = Date.now()
    const list = tasks.filter(
      (t) =>
        !['completed', 'archived', 'deleted'].includes(t.status) &&
        !blockedTaskIds.has(t.id) &&
        (t.start_date == null || new Date(t.start_date).getTime() <= now),
    )
    list.sort((a, b) => {
      const aUrgent = a.priority === 'urgent' ? 1 : 0
      const bUrgent = b.priority === 'urgent' ? 1 : 0
      if (bUrgent !== aUrgent) return bUrgent - aUrgent
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      if (aDue !== bDue) return aDue - bDue
      const aPri = PRIORITY_ORDER[a.priority] ?? 0
      const bPri = PRIORITY_ORDER[b.priority] ?? 0
      return bPri - aPri
    })
    return list
  }, [tasks, blockedTaskIds])

  /* Edit task/reminder modals (used on overdue step) */
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)

  /* Save reflection entry when moving to completion (step 7) */
  const saveEntryAndGoToCompletion = useCallback(async () => {
    const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    const entry = await createReflectionEntry({
      type: 'morning_briefing',
      title,
      responses: reflectionAnswers,
    })
    setSavedEntryId(entry.id)
    setSavedEntryTitle(entry.title ?? title)
    setStep(7)
  }, [reflectionAnswers])

  /* View overview: show saved entry (we already have title + responses in state) */
  const handleViewOverview = useCallback(() => {
    if (!savedEntryId && Object.keys(reflectionAnswers).length > 0) {
      const title = `Morning briefing – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      createReflectionEntry({
        type: 'morning_briefing',
        title,
        responses: reflectionAnswers,
      }).then((entry) => {
        setSavedEntryId(entry.id)
        setSavedEntryTitle(entry.title ?? title)
        setShowOverview(true)
      })
    } else {
      setShowOverview(true)
    }
  }, [savedEntryId, reflectionAnswers])

  /* Back from overview to completion step */
  const handleBackToBriefing = useCallback(() => {
    setShowOverview(false)
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
          onBegin={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <OverdueScreen
          overdueTasks={overdueTasks}
          overdueReminders={overdueReminders}
          overdueHabitReminders={overdueHabitReminders}
          loading={tasksLoading || remindersLoading}
          onEditTask={setEditTask}
          onEditReminder={setEditReminder}
          onUpdateReminder={updateReminder}
          onToggleReminderComplete={toggleReminderComplete}
          onHabitMarkComplete={async (habit, remindAt) => {
            /* Mark habit occurrence complete and advance linked reminder to next occurrence when present */
            const occurrenceDate = remindAt ? remindAt.slice(0, 10) : todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'completed')
            if (habit.reminder_id) {
              await advanceReminderToNextOccurrence(habit.reminder_id)
            }
            await refetchHabits()
          }}
          onHabitSkip={async (habit, remindAt) => {
            /* Mark habit occurrence skipped and advance linked reminder to next occurrence when present */
            const occurrenceDate = remindAt ? remindAt.slice(0, 10) : todayYMD
            await setHabitEntry(habit.id, occurrenceDate, 'skipped')
            if (habit.reminder_id) {
              await advanceReminderToNextOccurrence(habit.reminder_id)
            }
            await refetchHabits()
          }}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <PlanDayScreen
          availableTasks={availableTasks}
          lineUpTaskIds={lineUpTaskIds}
          onAddToLineUp={addToLineUp}
          onRemoveFromLineUp={removeFromLineUp}
          onNext={() => setStep(3)}
        />
      )}

      {step >= 3 && step <= 6 && (
        <ReflectionQuestionScreen
          question={REFLECTION_QUESTIONS[step - 3].label}
          value={reflectionAnswers[REFLECTION_QUESTIONS[step - 3].key] ?? ''}
          onChange={(value) =>
            setReflectionAnswers((prev) => ({
              ...prev,
              [REFLECTION_QUESTIONS[step - 3].key]: value,
            }))
          }
          onNext={() => {
            if (step === 6) saveEntryAndGoToCompletion()
            else setStep(step + 1)
          }}
          onBack={step > 3 ? () => setStep(step - 1) : undefined}
          showBack={step > 3}
        />
      )}

      {step === 7 && (
        <CompletionScreen onViewOverview={handleViewOverview} />
      )}

      {/* Progress bar: show for steps 1–7 (not greeting); total 8 steps */}
      {step >= 1 && step <= 7 && (
        <BriefingProgressBar
          currentStep={step}
          totalSteps={TOTAL_STEPS}
        />
      )}

      {/* Edit task modal (overdue step) */}
      {editTask && (
        <AddEditTaskModal
          isOpen={true}
          onClose={() => {
            setEditTask(null)
            refetchTasks()
          }}
          task={editTask}
          onUpdateTask={updateTask}
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
      )}

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
