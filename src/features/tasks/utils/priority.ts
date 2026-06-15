/* Priority display helpers: shared flag colors across task rows and dashboard widgets */

import type { TaskPriority } from '../types'

/**
 * Tailwind text color classes for filled Material priority flag icons.
 * none = grey; low = outline; medium = yellow; high = orange; urgent = red.
 */
export function getPriorityFlagClasses(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    none: 'text-outline-variant',
    low: 'text-outline',
    medium: 'text-[#FACC15]',
    high: 'text-[#F97316]',
    urgent: 'text-error',
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
