/* taskRowDisplay: Shared formatting for Bonsai task rows (dates, time, due colors) */

import type { Task } from '../types'
import {
  formatDueDateOnly,
  formatStartDueDisplay,
  getDueStatus,
} from './date'

/** Format minutes as "45m" or "2h 30m" */
export function formatTimeEstimateMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Due date text color from shared due status */
export function getDueDateColorClass(
  dueDate: string | null | undefined,
  timeZone: string,
): string {
  const status = getDueStatus(dueDate, timeZone)
  if (status === 'overdue') return 'text-error'
  if (status === 'dueSoon') return 'text-amber-600'
  return 'text-outline/60'
}

/** Lineup / card trailing date range (start–due) */
export function getLineupDateDisplay(
  task: Task,
  timeZone: string,
): string | null {
  return formatStartDueDisplay(task.start_date, task.due_date, timeZone)
}

/** Backlog single-line date: "Starts: Nov 2", "Nov 5", or start–due when both set */
export function getBacklogDateDisplay(task: Task, timeZone: string): string | null {
  const hasStart = task.start_date != null && task.start_date !== ''
  const hasDue = task.due_date != null && task.due_date !== ''
  if (hasStart && !hasDue) {
    const label = formatDueDateOnly(task.start_date, timeZone)
    return label ? `Starts: ${label.replace(/^Due /, '')}` : null
  }
  if (!hasStart && hasDue) {
    return formatDueDateOnly(task.due_date, timeZone)
  }
  if (hasStart && hasDue) {
    const range = formatStartDueDisplay(task.start_date, task.due_date, timeZone)
    if (!range) return null
    return range.replace(/^Due /, '').replace(/^Started /, 'Started: ')
  }
  return null
}

/** Material flag color class from priority */
export function getPriorityFlagColorClass(priority: Task['priority']): string {
  if (priority === 'urgent' || priority === 'high') return 'text-error'
  if (priority === 'medium') return 'text-primary'
  if (priority === 'low') return 'text-outline'
  return 'text-outline'
}

/** Subtask progress label "3/5" */
export function formatSubtaskProgress(
  completed: number,
  total: number,
): string | null {
  if (total <= 0) return null
  return `${Math.max(0, completed)}/${total}`
}

/** Checklist progress for metadata row */
export function formatChecklistProgress(
  completed: number,
  total: number,
): string | null {
  if (total <= 0) return null
  return `${completed}/${total}`
}
