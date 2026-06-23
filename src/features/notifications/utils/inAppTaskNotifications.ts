/* inAppTaskNotifications: Build overdue and due-soon task rows for the notification bell */

import type { Task, TaskStatus } from '../../tasks/types'
import { getDueStatus, taskDateToComparableMs } from '../../tasks/utils/date'
import { getDayKeyInTimeZone } from './notificationTime'
import {
  taskDueSoonDismissKey,
  taskOverdueDismissKey,
} from '../dismissedInAppNotifications'

/** Only surface active work items in the in-app task notification feed. */
export const NOTIFIABLE_TASK_STATUSES = new Set<TaskStatus>(['active', 'in_progress'])

export type InAppTaskOverdueRow = {
  kind: 'task_overdue'
  task: Task
  rowKey: string
}

export type InAppTaskDueSoonRow = {
  kind: 'task_due_soon'
  task: Task
  rowKey: string
}

export type InAppTaskNotificationRow = InAppTaskOverdueRow | InAppTaskDueSoonRow

function isNotifiableTask(task: Task): boolean {
  if (!task.due_date) return false
  if (task.habit_id != null) return false
  if (!NOTIFIABLE_TASK_STATUSES.has(task.status)) return false
  return true
}

function compareByDueMs(a: Task, b: Task, timeZone: string): number {
  const aMs = taskDateToComparableMs(a.due_date, timeZone) ?? 0
  const bMs = taskDateToComparableMs(b.due_date, timeZone) ?? 0
  return aMs - bMs
}

/**
 * Derive overdue and due-soon task notification rows from the current task list.
 * Uses shared getDueStatus semantics so the bell matches task list coloring/rules.
 */
export function buildTaskNotificationRows(
  tasks: Task[],
  timeZone: string,
  dismissedKeys: Set<string>,
): InAppTaskNotificationRow[] {
  const dayKey = getDayKeyInTimeZone(timeZone)
  const overdue: InAppTaskOverdueRow[] = []
  const dueSoon: InAppTaskDueSoonRow[] = []

  for (const task of tasks) {
    if (!isNotifiableTask(task)) continue

    const dueStatus = getDueStatus(task.due_date, timeZone)

    if (dueStatus === 'overdue') {
      const rowKey = taskOverdueDismissKey(task.id, dayKey)
      if (dismissedKeys.has(rowKey)) continue
      overdue.push({ kind: 'task_overdue', task, rowKey })
      continue
    }

    if (dueStatus === 'dueSoon') {
      const rowKey = taskDueSoonDismissKey(task.id)
      if (dismissedKeys.has(rowKey)) continue
      dueSoon.push({ kind: 'task_due_soon', task, rowKey })
    }
  }

  overdue.sort((a, b) => compareByDueMs(a.task, b.task, timeZone))
  dueSoon.sort((a, b) => compareByDueMs(a.task, b.task, timeZone))

  return [...overdue, ...dueSoon]
}
