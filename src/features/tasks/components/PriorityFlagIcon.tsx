/* PriorityFlagIcon: Filled Material flag icon with shared priority colors */

import { MaterialIcon } from '../../../components/MaterialIcon'
import type { TaskPriority } from '../types'
import { getPriorityFlagClasses } from '../utils/priority'

interface PriorityFlagIconProps {
  /** Task priority level */
  priority: TaskPriority
  /** Optional size/utility classes (e.g. text-base, text-xl) */
  className?: string
}

/**
 * Renders a filled Material "flag" icon colored by priority.
 * Used in task rows, modals, and the priority picker for consistent styling.
 */
export function PriorityFlagIcon({ priority, className = '' }: PriorityFlagIconProps) {
  return (
    <MaterialIcon
      name="flag"
      filled
      className={`shrink-0 leading-none ${getPriorityFlagClasses(priority)} ${className}`.trim()}
    />
  )
}
