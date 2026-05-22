/* useInAppNotifications: Habit reminders in the notification bell (no placeholders) */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildHabitReminderRows,
  filterActionableHabitReminders,
  habitReminderTargetLabel,
} from '../../habits/utils/habitReminderRows'
import { useHabits } from '../../habits/hooks/useHabits'
import { useTasks } from '../../tasks/hooks/useTasks'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import { formatStartDueDisplay, habitReminderEffectiveInstant } from '../../tasks/utils/date'
import { isoInstantToLocalCalendarYMD } from '../../../lib/localCalendarDate'
import {
  loadDismissedHabitIds,
  saveDismissedHabitIds,
} from '../dismissedHabitNotifications'

/**
 * In-app notification feed: actionable habit reminders with dismiss + habit actions.
 */
export function useInAppNotifications() {
  const timeZone = useUserTimeZone()
  const { tasks, refetch: refetchTasks } = useTasks()
  const {
    habitsWithStreaks,
    entriesByHabit,
    todayYMD,
    setEntry: setHabitEntry,
    refetch: refetchHabits,
  } = useHabits()

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedHabitIds())
  const [actionInFlightIds, setActionInFlightIds] = useState<Set<string>>(new Set())

  /* Reload dismissals when the calendar day changes */
  useEffect(() => {
    setDismissedIds(loadDismissedHabitIds())
  }, [todayYMD])

  const allRows = useMemo(
    () => buildHabitReminderRows(tasks, habitsWithStreaks),
    [tasks, habitsWithStreaks],
  )

  const visibleReminders = useMemo(
    () =>
      filterActionableHabitReminders(
        allRows,
        timeZone,
        todayYMD,
        entriesByHabit,
        dismissedIds,
      ),
    [allRows, timeZone, todayYMD, entriesByHabit, dismissedIds],
  )

  const unreadCount = visibleReminders.length

  const persistDismiss = useCallback((next: Set<string>) => {
    setDismissedIds(next)
    saveDismissedHabitIds(next)
  }, [])

  const dismissHabit = useCallback(
    (habitId: string) => {
      persistDismiss(new Set(dismissedIds).add(habitId))
    },
    [dismissedIds, persistDismiss],
  )

  const dismissAll = useCallback(() => {
    const next = new Set(dismissedIds)
    for (const { habit } of visibleReminders) {
      next.add(habit.id)
    }
    persistDismiss(next)
  }, [dismissedIds, visibleReminders, persistDismiss])

  const runHabitAction = useCallback(
    async (
      habitId: string,
      row: (typeof visibleReminders)[number],
      status: 'completed' | 'minimum' | 'skipped',
    ) => {
      setActionInFlightIds((prev) => new Set(prev).add(habitId))
      try {
        const { habit, task, remindAt } = row
        const occurrenceSourceIso = habit.todo_remind_at ?? remindAt ?? task.due_date
        const occurrenceDate =
          isoInstantToLocalCalendarYMD(occurrenceSourceIso) ?? todayYMD
        await setHabitEntry(habitId, occurrenceDate, status)
        await refetchHabits()
        await refetchTasks()
        if (status === 'completed' || status === 'skipped') {
          persistDismiss(new Set(dismissedIds).add(habitId))
        }
      } finally {
        setActionInFlightIds((prev) => {
          const next = new Set(prev)
          next.delete(habitId)
          return next
        })
      }
    },
    [todayYMD, setHabitEntry, refetchHabits, refetchTasks, dismissedIds, persistDismiss],
  )

  const getReminderBody = useCallback(
    (row: (typeof visibleReminders)[number]) => {
      const { habit, task, remindAt } = row
      const dueSource = task.due_date ?? remindAt
      const effectiveIso = habitReminderEffectiveInstant(
        dueSource,
        habit.reminder_time ?? null,
        timeZone,
      )
      const dueLabel = formatStartDueDisplay(undefined, effectiveIso, timeZone) ?? 'Due now'
      return `${habitReminderTargetLabel(habit)} · ${dueLabel}`
    },
    [timeZone],
  )

  return {
    visibleReminders,
    unreadCount,
    dismissHabit,
    dismissAll,
    runHabitAction,
    actionInFlightIds,
    getReminderBody,
    refetch: async () => {
      await Promise.all([refetchHabits(), refetchTasks()])
    },
  }
}
