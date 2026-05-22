/* Available tasks helpers: shared filter/sort for Available view and upcoming widgets */

import type { Task } from '../types'
import { isStartAvailableNow, taskDateToComparableMs } from './date'

/** Priority order for sort: higher index = higher priority (urgent last so it sorts first when desc) */
const PRIORITY_ORDER: Record<Task['priority'], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

/** True when priority is medium, high, or urgent (not none or low). */
export function isPriorityMediumOrAbove(priority: Task['priority']): boolean {
  return (PRIORITY_ORDER[priority] ?? 0) >= PRIORITY_ORDER.medium
}

/**
 * Matches default Available view rules: incomplete, not blocked, priority not none, start now or earlier.
 */
export function isTaskAvailableForWork(
  task: Task,
  blockedTaskIds: Set<string>,
  timeZone: string,
): boolean {
  if (task.status === 'archived' || task.status === 'deleted' || task.status === 'completed') {
    return false
  }
  if (blockedTaskIds.has(task.id)) return false
  if ((task.priority ?? 'medium') === 'none') return false
  if (!isStartAvailableNow(task.start_date, timeZone)) return false
  return true
}

/** Sort tasks using Available view ordering (urgent → due → priority → status). */
export function sortTasksAvailableStyle(tasks: Task[], timeZone: string): Task[] {
  return [...tasks].sort((a, b) => {
    const aUrgent = a.priority === 'urgent' ? 1 : 0
    const bUrgent = b.priority === 'urgent' ? 1 : 0
    if (bUrgent !== aUrgent) return bUrgent - aUrgent

    const aDue = taskDateToComparableMs(a.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
    const bDue = taskDateToComparableMs(b.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) return aDue - bDue

    const aPri = PRIORITY_ORDER[a.priority] ?? 0
    const bPri = PRIORITY_ORDER[b.priority] ?? 0
    if (bPri !== aPri) return bPri - aPri

    const statusOrder = (s: Task['status']) =>
      s === 'in_progress' ? 1 : s === 'active' ? 0 : -1
    return statusOrder(b.status) - statusOrder(a.status)
  })
}

/**
 * Filter and sort a list of tasks into the Available ordering:
 * - Excludes archived, deleted, and completed tasks.
 * - Excludes blocked tasks based on dependency graph.
 * - Excludes tasks whose start date is in the future.
 * - Sorts by urgent first, then due date, then priority, then status.
 */
export function getAvailableTasksFromList(
  tasks: Task[],
  blockedTaskIds: Set<string>,
  timeZone: string,
): Task[] {
  /* Filter: only tasks that are incomplete, not blocked, and available to start now */
  const available = tasks.filter((t) => {
    if (t.status === 'archived' || t.status === 'deleted' || t.status === 'completed') {
      return false
    }
    if (blockedTaskIds.has(t.id)) return false
    /* Start date availability: date-only start dates become available at local midnight (not UTC). */
    if (!isStartAvailableNow(t.start_date, timeZone)) return false
    return true
  })

  return sortTasksAvailableStyle(available, timeZone)
}

