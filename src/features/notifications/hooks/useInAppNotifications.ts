/* useInAppNotifications: Habit reminders in the notification bell (DB-backed per-day instances) */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  habitNotificationDismissKey,
  habitReminderTargetLabel,
} from '../../habits/utils/habitReminderRows'
import { isHabitEligibleForTodoReminder } from '../../habits/habitReminderEligibility'
import { useHabits } from '../../habits/hooks/useHabits'
import { useTasks } from '../../tasks/hooks/useTasks'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import type { HabitWithStreaks } from '../../habits/types'
import type { Task } from '../../tasks/types'
import {
  dismissHabitReminderByOccurrence,
  dismissHabitReminderNotification,
  ensurePendingHabitReminderNotifications,
  getPendingHabitReminderNotifications,
  resolveHabitReminderByOccurrence,
  resolveHabitReminderNotification,
  type HabitReminderNotification,
} from '../../../lib/supabase/habitReminderNotifications'
import {
  loadDismissedHabitReminderKeys,
  saveDismissedHabitReminderKeys,
} from '../dismissedHabitNotifications'

export type InAppHabitReminderRow = {
  notificationId: string
  habit: HabitWithStreaks
  task: Task
  remindAt: string | null
  occurrenceDate: string
  rowKey: string
}

/**
 * In-app notification feed: pending habit reminder instances with dismiss + habit actions.
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

  const [pendingNotifications, setPendingNotifications] = useState<HabitReminderNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInFlightIds, setActionInFlightIds] = useState<Set<string>>(new Set())
  const [localDismissMigrated, setLocalDismissMigrated] = useState(false)

  const eligibleHabits = useMemo(
    () => habitsWithStreaks.filter((h) => isHabitEligibleForTodoReminder(h)),
    [habitsWithStreaks],
  )

  const tasksByHabitId = useMemo(() => {
    const map: Record<string, (typeof tasks)[number]> = {}
    for (const task of tasks) {
      if (task.habit_id != null && task.status !== 'deleted' && task.status !== 'archived') {
        map[task.habit_id] = task
      }
    }
    return map
  }, [tasks])

  /* One-time migration: push legacy localStorage dismiss keys to Supabase */
  useEffect(() => {
    if (localDismissMigrated) return
    let cancelled = false

    const migrate = async () => {
      const keys = loadDismissedHabitReminderKeys()
      if (keys.size > 0) {
        await Promise.all(
          Array.from(keys).map(async (key) => {
            const idx = key.lastIndexOf(':')
            if (idx <= 0) return
            const habitId = key.slice(0, idx)
            const occurrenceDate = key.slice(idx + 1)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) return
            await dismissHabitReminderByOccurrence(habitId, occurrenceDate)
          }),
        )
        saveDismissedHabitReminderKeys(new Set())
      }
      if (!cancelled) setLocalDismissMigrated(true)
    }

    void migrate().catch((err) => {
      console.error('Error migrating dismissed habit notifications:', err)
      if (!cancelled) setLocalDismissMigrated(true)
    })

    return () => {
      cancelled = true
    }
  }, [localDismissMigrated])

  const refreshNotifications = useCallback(async () => {
    if (!localDismissMigrated) return
    setLoading(true)
    try {
      await ensurePendingHabitReminderNotifications({
        habits: eligibleHabits,
        tasksByHabitId,
        entriesByHabit,
        timeZone,
        todayYMD,
      })
      const rows = await getPendingHabitReminderNotifications()
      setPendingNotifications(rows)
    } catch (err) {
      console.error('Error loading habit reminder notifications:', err)
      setPendingNotifications([])
    } finally {
      setLoading(false)
    }
  }, [
    localDismissMigrated,
    eligibleHabits,
    tasksByHabitId,
    entriesByHabit,
    timeZone,
    todayYMD,
  ])

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  const visibleReminders = useMemo((): InAppHabitReminderRow[] => {
    const rows: InAppHabitReminderRow[] = []

    for (const notification of pendingNotifications) {
      const habit = habitsWithStreaks.find((h) => h.id === notification.habit_id)
      const task = tasksByHabitId[notification.habit_id]
      if (!habit || !task) continue

      const occurrenceDate = notification.occurrence_date
      rows.push({
        notificationId: notification.id,
        habit,
        task,
        remindAt: notification.remind_at,
        occurrenceDate,
        rowKey: habitNotificationDismissKey(habit.id, occurrenceDate),
      })
    }

    return rows.sort((a, b) => {
      const aMs = a.remindAt ? new Date(a.remindAt).getTime() : 0
      const bMs = b.remindAt ? new Date(b.remindAt).getTime() : 0
      return aMs - bMs
    })
  }, [pendingNotifications, habitsWithStreaks, tasksByHabitId])

  const unreadCount = visibleReminders.length

  const dismissReminder = useCallback(
    async (rowKey: string) => {
      const row = visibleReminders.find((r) => r.rowKey === rowKey)
      if (!row) return
      setActionInFlightIds((prev) => new Set(prev).add(rowKey))
      try {
        await dismissHabitReminderNotification(row.notificationId)
        setPendingNotifications((prev) => prev.filter((n) => n.id !== row.notificationId))
      } finally {
        setActionInFlightIds((prev) => {
          const next = new Set(prev)
          next.delete(rowKey)
          return next
        })
      }
    },
    [visibleReminders],
  )

  const dismissAll = useCallback(async () => {
    const rows = [...visibleReminders]
    for (const row of rows) {
      await dismissHabitReminderNotification(row.notificationId)
    }
    setPendingNotifications([])
  }, [visibleReminders])

  const refetch = useCallback(async () => {
    await Promise.all([refetchHabits(), refetchTasks()])
    await refreshNotifications()
  }, [refetchHabits, refetchTasks, refreshNotifications])

  const runHabitAction = useCallback(
    async (
      rowKey: string,
      row: InAppHabitReminderRow,
      status: 'completed' | 'minimum' | 'skipped',
    ) => {
      setActionInFlightIds((prev) => new Set(prev).add(rowKey))
      try {
        const { habit, occurrenceDate, notificationId } = row
        await setHabitEntry(habit.id, occurrenceDate, status)
        await resolveHabitReminderNotification(notificationId)
        await refetchHabits()
        await refetchTasks()
        setPendingNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      } catch (err) {
        console.error('Error running habit notification action:', err)
        await resolveHabitReminderByOccurrence(row.habit.id, row.occurrenceDate).catch(() => {})
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
    (row: InAppHabitReminderRow) => {
      const { habit, remindAt } = row
      const dueLabel = formatStartDueDisplay(undefined, remindAt, timeZone) ?? 'Due now'
      return `${habitReminderTargetLabel(habit)} · ${dueLabel}`
    },
    [timeZone],
  )

  return {
    visibleReminders,
    unreadCount,
    loading,
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
