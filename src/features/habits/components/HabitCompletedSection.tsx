/* HabitCompletedSection: Collapsible grid of habits completed on the selected day */

import { useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { HabitWithStreaks } from '../types'
import { HabitCompletedCard } from './HabitCompletedCard'

export interface HabitCompletedSectionProps {
  title: string
  habits: HabitWithStreaks[]
  onEditHabit: (habit: HabitWithStreaks) => void
  defaultOpen?: boolean
}

/**
 * Collapsible section listing completed habit cards.
 */
export function HabitCompletedSection({
  title,
  habits,
  onEditHabit,
  defaultOpen = true,
}: HabitCompletedSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (habits.length === 0) return null

  return (
    <section className="mb-16">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-8 flex w-full items-center gap-3"
      >
        <span className="text-secondary font-bold uppercase tracking-widest text-on-surface-variant">
          {title}
        </span>
        <MaterialIcon
          name="keyboard_arrow_down"
          className={`text-[20px] text-on-surface-variant transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
        <div className="h-px flex-grow bg-outline-variant/30" />
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <HabitCompletedCard key={habit.id} habit={habit} onEditHabit={onEditHabit} />
          ))}
        </div>
      )}
    </section>
  )
}
