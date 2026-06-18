/* HabitSectionHeader: Uppercase label with optional icon and horizontal rule */

import type { ReactNode } from 'react'

export interface HabitSectionHeaderProps {
  label: string
  icon?: ReactNode
}

/**
 * Section divider used on the Habits page (Active Habits, etc.).
 */
export function HabitSectionHeader({ label, icon }: HabitSectionHeaderProps) {
  return (
    <div className="mb-8 flex items-center gap-3">
      {icon}
      <span className="text-secondary font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <div className="h-px flex-grow bg-outline-variant/30" />
    </div>
  )
}
