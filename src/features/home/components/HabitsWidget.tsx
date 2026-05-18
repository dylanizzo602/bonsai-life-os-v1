/* HabitsWidget: Up to four habits as circular streak badges on the dashboard */

import { useMemo } from 'react'
import { DashboardBentoCard } from './DashboardBentoCard'
import { useHabits } from '../../habits/hooks/useHabits'
import { formatHabitStreakBadge } from '../../habits/formatHabitStreak'
import { HabitsIcon } from '../../../components/icons'
import type { HabitWithStreaks } from '../../habits/types'

export interface HabitsWidgetProps {
  onViewAll: () => void
}

/** Simple icon per habit name keyword (fallback: first letter) */
function habitEmoji(habit: HabitWithStreaks): string {
  const n = habit.name.toLowerCase()
  if (n.includes('meditat')) return '🧘'
  if (n.includes('read')) return '📖'
  if (n.includes('exercise') || n.includes('workout') || n.includes('gym')) return '🏋️'
  if (n.includes('water') || n.includes('hydrat')) return '💧'
  return habit.name.charAt(0).toUpperCase()
}

/**
 * Habits bento widget: four habit circles with compact streak badges.
 */
export function HabitsWidget({ onViewAll }: HabitsWidgetProps) {
  const { habitsWithStreaks } = useHabits()

  /* Display: first four habits by sort order (stable, not random) */
  const four = useMemo(
    () => [...habitsWithStreaks].sort((a, b) => a.sort_order - b.sort_order).slice(0, 4),
    [habitsWithStreaks],
  )

  return (
    <DashboardBentoCard
      title="Habits"
      titleIcon={<HabitsIcon className="h-6 w-6" />}
      actions={
        <button
          type="button"
          onClick={onViewAll}
          className="text-secondary font-medium text-primary hover:underline"
        >
          View all
        </button>
      }
    >
      {four.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No habits yet.</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {four.map((habit) => {
            const active = habit.currentStreak > 0
            const badge = formatHabitStreakBadge(habit, habit.currentStreak)
            return (
              <button
                key={habit.id}
                type="button"
                onClick={onViewAll}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full text-lg ${
                    active
                      ? 'bg-bonsai-sage-400 text-white'
                      : 'border border-dashed border-outline-variant bg-surface-container-high text-on-surface-variant/40'
                  }`}
                >
                  <span aria-hidden>{habitEmoji(habit)}</span>
                  <span
                    className={`absolute -right-1 -top-1 rounded-full border-2 border-surface px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {badge}
                  </span>
                </div>
                <span
                  className={`max-w-full truncate text-center text-xs font-medium ${
                    active ? 'text-on-surface-variant' : 'text-on-surface-variant/60'
                  }`}
                >
                  {habit.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </DashboardBentoCard>
  )
}
