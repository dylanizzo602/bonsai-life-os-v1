/* Undergrowth task filter: Sunday filler tasks to review before planning */

import type { Task } from '../../tasks/types'

const STALE_DAYS = 30

function isOpenBonsaiTask(task: Task): boolean {
  return (
    !task.habit_id &&
    task.status !== 'completed' &&
    task.status !== 'archived' &&
    task.status !== 'deleted'
  )
}

function daysSinceCreated(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return 0
  return Math.floor((Date.now() - created) / (24 * 60 * 60 * 1000))
}

/** True when task qualifies for the Sunday "Clear the undergrowth" step */
export function isUndergrowthTask(task: Task): boolean {
  if (!isOpenBonsaiTask(task)) return false

  const noDue = task.due_date == null
  const priority = task.priority
  const lowOrNone = priority === 'none' || priority === 'low'

  if (noDue && lowOrNone) return true

  const age = daysSinceCreated(task.created_at)
  if (age >= STALE_DAYS && (priority === 'none' || priority === 'low' || priority === 'medium')) {
    return true
  }

  return false
}

/** Filter and sort undergrowth candidates (oldest first) */
export function getUndergrowthTasks(tasks: Task[]): Task[] {
  return tasks
    .filter(isUndergrowthTask)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/** Human-readable age label for undergrowth cards */
export function formatTaskAgeLabel(createdAt: string): string {
  const days = daysSinceCreated(createdAt)
  if (days >= 60) {
    const months = Math.floor(days / 30)
    return `Created ${months} month${months === 1 ? '' : 's'} ago`
  }
  if (days >= 14) {
    const weeks = Math.floor(days / 7)
    return `Created ${weeks} week${weeks === 1 ? '' : 's'} ago`
  }
  if (days >= 1) {
    return `Created ${days} day${days === 1 ? '' : 's'} ago`
  }
  return 'Created today'
}
