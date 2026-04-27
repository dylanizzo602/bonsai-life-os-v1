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

  /* Sort: urgent first, then earliest due, then priority high→low, then status in_progress→active→others */
  const sorted = [...available].sort((a, b) => {
    const aUrgent = a.priority === 'urgent' ? 1 : 0
    const bUrgent = b.priority === 'urgent' ? 1 : 0
    if (bUrgent !== aUrgent) return bUrgent - aUrgent

    /* Due sort: treat date-only due as local-day boundary to avoid 8pm "previous day" shifts. */
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

  return sorted
}

