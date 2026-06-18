/* HabitCompletedCard: Compact card for habits completed on the selected day */

import { MaterialIcon } from '../../../components/MaterialIcon'
import type { HabitWithStreaks } from '../types'
import { getHabitCompletionSubtitle } from '../utils/habitDisplay'

export interface HabitCompletedCardProps {
  habit: HabitWithStreaks
  onEditHabit: (habit: HabitWithStreaks) => void
}

/**
 * Completed habit row card shown in the collapsible completed section.
 */
export function HabitCompletedCard({ habit, onEditHabit }: HabitCompletedCardProps) {
  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-container p-6 opacity-80">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MaterialIcon name="check_circle" filled />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-body font-semibold text-on-surface">{habit.name}</h3>
            <p className="text-secondary text-on-surface-variant">
              {getHabitCompletionSubtitle(habit, habit.currentStreak)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEditHabit(habit)}
          className="shrink-0 text-on-surface-variant/40 transition-colors hover:text-primary"
          aria-label="Edit habit"
        >
          <MaterialIcon name="more_vert" />
        </button>
      </div>
    </div>
  )
}
