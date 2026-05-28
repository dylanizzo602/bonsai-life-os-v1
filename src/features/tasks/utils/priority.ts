/* Priority display helpers: shared flag colors across task rows and dashboard widgets */

import type { TaskPriority } from '../types'

/**
 * Tailwind classes for FlagIcon: stroke, fill, and text (currentColor).
 * none = black stroke / white fill; low = grey; medium = blue; high = yellow; urgent = red.
 */
export function getPriorityFlagClasses(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    none: 'stroke-bonsai-slate-800 fill-white',
    low: 'stroke-bonsai-slate-400 fill-bonsai-slate-100 text-bonsai-slate-500',
    medium: 'stroke-blue-500 fill-blue-50 text-blue-600',
    high: 'stroke-yellow-500 fill-yellow-100 text-yellow-600',
    urgent: 'stroke-red-500 fill-red-100 text-red-600',
  }
  return map[priority] ?? map.none
}

/** Human-readable priority label for pills and metadata */
export function getPriorityLabel(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    none: 'None',
    low: 'Low',
    medium: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  }
  return map[priority] ?? 'None'
}
