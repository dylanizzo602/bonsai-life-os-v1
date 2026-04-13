/* UpcomingTasksWidget: First 5 available tasks in compact view; View All and Add task */

import { useCallback, useMemo, useState } from 'react'
import { CompactTaskItem } from '../../tasks/CompactTaskItem'
import { DashboardWidget } from './DashboardWidget'
import { useUpcomingTasks } from '../hooks/useUpcomingTasks'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { Task } from '../../tasks/types'
import { Button } from '../../../components/Button'
import { HabitReminderItem } from '../../habits/HabitReminderItem'
import { useHabits } from '../../habits/hooks/useHabits'
import { useTasks } from '../../tasks/hooks/useTasks'
import { isoInstantToLocalCalendarYMD } from '../../../lib/localCalendarDate'

export interface UpcomingTasksWidgetProps {
  onViewAll: () => void
  onAddTask: () => void
  onOpenEditTask?: (task: Task) => void
}

/**
 * Upcoming tasks widget: 5 available tasks (compact), View All, Add task.
 */
export function UpcomingTasksWidget({
  onViewAll,
  onAddTask,
  onOpenEditTask,
}: UpcomingTasksWidgetProps) {
  const timeZone = useUserTimeZone()
  /* Task source: first 5 available tasks (same logic as Tasks → Available view) */
  const upcomingTasks = useUpcomingTasks()
  /* Task refresh: used after habit actions so the linked task row updates immediately */
  const { refetch: refetchTasks } = useTasks()
  /* Habits source: used to render habit reminder rows like the mobile task list */
  const { habitsWithStreaks, todayYMD, setEntry: setHabitEntry, refetch: refetchHabits } = useHabits()
  /* In-flight habit actions: disable buttons to prevent double-submit */
  const [habitActionInFlightIds, setHabitActionInFlightIds] = useState<Set<string>>(new Set())

  /* Habit lookup: map habit id -> habit with streaks for quick matching */
  const habitById = useMemo(() => {
    return Object.fromEntries(habitsWithStreaks.map((h) => [h.id, h]))
  }, [habitsWithStreaks])

  const formatDue = (iso: string | null | undefined) => formatStartDueDisplay(iso, null, timeZone)

  /* Habit action handler: record an entry for the reminder occurrence and refresh habits/tasks */
  const handleHabitAction = useCallback(
    async (habitId: string, dueInstant: string | null | undefined, status: 'completed' | 'minimum' | 'skipped') => {
      const occurrenceDate = isoInstantToLocalCalendarYMD(dueInstant ?? null) ?? todayYMD
      setHabitActionInFlightIds((prev) => new Set(prev).add(habitId))
      try {
        await setHabitEntry(habitId, occurrenceDate, status)
        await refetchHabits()
        await refetchTasks()
      } finally {
        setHabitActionInFlightIds((prev) => {
          const next = new Set(prev)
          next.delete(habitId)
          return next
        })
      }
    },
    [refetchHabits, refetchTasks, setHabitEntry, todayYMD],
  )

  return (
    <DashboardWidget
      title="Upcoming Tasks"
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onViewAll}>
            View All
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onAddTask}>
            + Add task
          </Button>
        </div>
      }
    >
      {upcomingTasks.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500">No upcoming tasks.</p>
      ) : (
        <ul className="space-y-2">
          {upcomingTasks.map((task) => {
            /* Habit-linked tasks: render as habit reminders (same row style as mobile tasks list) */
            if (task.habit_id) {
              const habit = habitById[task.habit_id]
              if (habit) {
                const inFlight = habitActionInFlightIds.has(habit.id)
                return (
                  <li key={task.id}>
                    <HabitReminderItem
                      habit={habit}
                      task={task}
                      remindAt={task.due_date}
                      reminderTime={habit.reminder_time}
                      onTargetComplete={() => handleHabitAction(habit.id, task.due_date, 'completed')}
                      onMinimum={() => handleHabitAction(habit.id, task.due_date, 'minimum')}
                      onSkip={() => handleHabitAction(habit.id, task.due_date, 'skipped')}
                      actionsDisabled={inFlight}
                      density="compact"
                      showStreakBreakdown={false}
                    />
                  </li>
                )
              }
            }

            /* Normal tasks: render compact task row */
            return (
              <li key={task.id}>
                <CompactTaskItem
                  task={task}
                  formatDueDate={formatDue}
                  onClick={() => onOpenEditTask?.(task)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </DashboardWidget>
  )
}
