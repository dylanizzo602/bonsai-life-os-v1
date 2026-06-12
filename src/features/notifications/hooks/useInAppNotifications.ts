/* useInAppNotifications: Habit reminders in the notification bell (no placeholders) */

import { useCallback, useMemo, useState } from 'react'
import {
  buildHabitNotificationRows,
  habitReminderTargetLabel,
} from '../../habits/utils/habitReminderRows'
import { useHabits } from '../../habits/hooks/useHabits'
import { useTasks } from '../../tasks/hooks/useTasks'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import {
  loadDismissedHabitReminderKeys,
  saveDismissedHabitReminderKeys,
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

  const [dismissedRowKeys, setDismissedRowKeys] = useState<Set<string>>(() =>
    loadDismissedHabitReminderKeys(),
  )
  const [actionInFlightIds, setActionInFlightIds] = useState<Set<string>>(new Set())

  const visibleReminders = useMemo(
    () =>
      buildHabitNotificationRows(
        tasks,
        habitsWithStreaks,
        timeZone,
        todayYMD,
        entriesByHabit,
        dismissedRowKeys,
      ),
    [tasks, habitsWithStreaks, timeZone, todayYMD, entriesByHabit, dismissedRowKeys],
  )

  const unreadCount = visibleReminders.length

  const dismissReminder = useCallback(
    (rowKey: string) => {
      setDismissedRowKeys((prev) => {
        const next = new Set(prev).add(rowKey)
        saveDismissedHabitReminderKeys(next)
        return next
      })
    },
    [],
  )

  const dismissAll = useCallback(() => {
    setDismissedRowKeys((prev) => {
      const next = new Set(prev)
      for (const { rowKey } of visibleReminders) {
        next.add(rowKey)
      }
      saveDismissedHabitReminderKeys(next)
      return next
    })
  }, [visibleReminders])

  const refetch = useCallback(async () => {
    await Promise.all([refetchHabits(), refetchTasks()])
  }, [refetchHabits, refetchTasks])

  const runHabitAction = useCallback(
    async (
      rowKey: string,
      row: (typeof visibleReminders)[number],
      status: 'completed' | 'minimum' | 'skipped',
    ) => {
      setActionInFlightIds((prev) => new Set(prev).add(rowKey))
      try {
        const { habit, occurrenceDate } = row
        await setHabitEntry(habit.id, occurrenceDate, status)
        await refetchHabits()
        await refetchTasks()
        setDismissedRowKeys((prev) => {
          const next = new Set(prev).add(rowKey)
          saveDismissedHabitReminderKeys(next)
          return next
        })
      } finally {
        setActionInFlightIds((prev) => {
          const next = new Set(prev)
          next.delete(rowKey)
          return next
        })
      }
    },
    [setHabitEntry, refetchHabits, refetchTasks],
  )

  const getReminderBody = useCallback(
    (row: (typeof visibleReminders)[number]) => {
      const { habit, remindAt } = row
      const dueLabel = formatStartDueDisplay(undefined, remindAt, timeZone) ?? 'Due now'
      return `${habitReminderTargetLabel(habit)} · ${dueLabel}`
    },
    [timeZone],
  )

  return {
    visibleReminders,
    unreadCount,
    dismissReminder,
    /** @deprecated Use dismissReminder(rowKey) */
    dismissHabit: dismissReminder,
    dismissAll,
    runHabitAction,
    actionInFlightIds,
    getReminderBody,
    refetch,
  }
}
