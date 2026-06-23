/* useInAppNotifications: In-app notification bell feed (habits, tasks, morning briefing) */

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
import { getHasCompletedMorningBriefingToday } from '../../../lib/supabase/reflections'
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
import {
  dismissMorningBriefingToday,
  isMorningBriefingDismissedToday,
  loadDismissedTaskNotificationKeys,
  saveDismissedTaskNotificationKeys,
} from '../dismissedInAppNotifications'
import { buildMorningBriefingNotificationRow } from '../utils/inAppBriefingNotification'
import { buildTaskNotificationRows } from '../utils/inAppTaskNotifications'

export type InAppHabitReminderRow = {
  kind: 'habit'
  notificationId: string
  habit: HabitWithStreaks
  task: Task
  remindAt: string | null
  occurrenceDate: string
  rowKey: string
}

export type InAppTaskOverdueNotification = {
  kind: 'task_overdue'
  task: Task
  rowKey: string
}

export type InAppTaskDueSoonNotification = {
  kind: 'task_due_soon'
  task: Task
  rowKey: string
}

export type InAppMorningBriefingNotification = {
  kind: 'morning_briefing'
  rowKey: string
  dayKey: string
}

export type InAppNotificationItem =
  | InAppHabitReminderRow
  | InAppTaskOverdueNotification
  | InAppTaskDueSoonNotification
  | InAppMorningBriefingNotification

/**
 * In-app notification feed: habit reminders, overdue/due-soon tasks, and missed morning briefing.
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
  const [completedMorningBriefingToday, setCompletedMorningBriefingToday] = useState<
    boolean | null
  >(null)
  const [briefingDismissedToday, setBriefingDismissedToday] = useState(false)
  const [dismissedTaskKeys, setDismissedTaskKeys] = useState<Set<string>>(() =>
    loadDismissedTaskNotificationKeys(),
  )

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

  /* Load briefing completion and shared dismiss state when timezone changes */
  useEffect(() => {
    let cancelled = false
    getHasCompletedMorningBriefingToday(timeZone).then((completed) => {
      if (!cancelled) setCompletedMorningBriefingToday(completed)
    })
    setBriefingDismissedToday(isMorningBriefingDismissedToday(timeZone))
    return () => {
      cancelled = true
    }
  }, [timeZone])

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
      const [completed] = await Promise.all([
        getHasCompletedMorningBriefingToday(timeZone),
        ensurePendingHabitReminderNotifications({
          habits: eligibleHabits,
          tasksByHabitId,
          entriesByHabit,
          timeZone,
          todayYMD,
        }),
      ])
      setCompletedMorningBriefingToday(completed)
      setBriefingDismissedToday(isMorningBriefingDismissedToday(timeZone))
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

  const habitRows = useMemo((): InAppHabitReminderRow[] => {
    const rows: InAppHabitReminderRow[] = []

    for (const notification of pendingNotifications) {
      const habit = habitsWithStreaks.find((h) => h.id === notification.habit_id)
      const task = tasksByHabitId[notification.habit_id]
      if (!habit || !task) continue

      const occurrenceDate = notification.occurrence_date
      rows.push({
        kind: 'habit',
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

  const taskRows = useMemo(
    () => buildTaskNotificationRows(tasks, timeZone, dismissedTaskKeys),
    [tasks, timeZone, dismissedTaskKeys],
  )

  const briefingRow = useMemo(
    () =>
      buildMorningBriefingNotificationRow({
        timeZone,
        completedToday: completedMorningBriefingToday,
        dismissedToday: briefingDismissedToday,
      }),
    [timeZone, completedMorningBriefingToday, briefingDismissedToday],
  )

  /* Merge and sort: briefing → overdue → due soon → habits */
  const visibleNotifications = useMemo((): InAppNotificationItem[] => {
    const items: InAppNotificationItem[] = []
    if (briefingRow) items.push(briefingRow)
    for (const row of taskRows) {
      if (row.kind === 'task_overdue') {
        items.push({ kind: 'task_overdue', task: row.task, rowKey: row.rowKey })
      } else {
        items.push({ kind: 'task_due_soon', task: row.task, rowKey: row.rowKey })
      }
    }
    items.push(...habitRows)
    return items
  }, [briefingRow, taskRows, habitRows])

  /** @deprecated Use visibleNotifications */
  const visibleReminders = habitRows

  const unreadCount = visibleNotifications.length

  const dismissNotification = useCallback(
    async (rowKey: string) => {
      const item = visibleNotifications.find((n) => n.rowKey === rowKey)
      if (!item) return

      setActionInFlightIds((prev) => new Set(prev).add(rowKey))
      try {
        if (item.kind === 'habit') {
          await dismissHabitReminderNotification(item.notificationId)
          setPendingNotifications((prev) => prev.filter((n) => n.id !== item.notificationId))
          return
        }

        if (item.kind === 'morning_briefing') {
          dismissMorningBriefingToday(timeZone)
          setBriefingDismissedToday(true)
          return
        }

        setDismissedTaskKeys((prev) => {
          const next = new Set(prev)
          next.add(rowKey)
          saveDismissedTaskNotificationKeys(next)
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
    [visibleNotifications, timeZone],
  )

  const dismissReminder = dismissNotification

  const dismissAll = useCallback(async () => {
    for (const item of visibleNotifications) {
      if (item.kind === 'habit') {
        await dismissHabitReminderNotification(item.notificationId)
      } else if (item.kind === 'morning_briefing') {
        dismissMorningBriefingToday(timeZone)
      }
    }

    const nextTaskKeys = new Set(dismissedTaskKeys)
    for (const item of visibleNotifications) {
      if (item.kind === 'task_overdue' || item.kind === 'task_due_soon') {
        nextTaskKeys.add(item.rowKey)
      }
    }
    saveDismissedTaskNotificationKeys(nextTaskKeys)
    setDismissedTaskKeys(nextTaskKeys)
    setBriefingDismissedToday(true)
    setPendingNotifications([])
  }, [visibleNotifications, dismissedTaskKeys, timeZone])

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

  const getNotificationBody = useCallback(
    (item: InAppNotificationItem) => {
      if (item.kind === 'habit') {
        const dueLabel = formatStartDueDisplay(undefined, item.remindAt, timeZone) ?? 'Due now'
        return `${habitReminderTargetLabel(item.habit)} · ${dueLabel}`
      }
      if (item.kind === 'task_overdue' || item.kind === 'task_due_soon') {
        return formatStartDueDisplay(item.task.start_date, item.task.due_date, timeZone) ?? 'Due'
      }
      return 'Finish your briefing for today.'
    },
    [timeZone],
  )

  const getReminderBody = useCallback(
    (row: InAppHabitReminderRow) => getNotificationBody(row),
    [getNotificationBody],
  )

  return {
    visibleNotifications,
    /** @deprecated Use visibleNotifications */
    visibleReminders,
    unreadCount,
    loading,
    dismissNotification,
    dismissReminder,
    /** @deprecated Use dismissNotification(rowKey) */
    dismissHabit: dismissNotification,
    dismissAll,
    runHabitAction,
    actionInFlightIds,
    getNotificationBody,
    getReminderBody,
    refetch,
  }
}
