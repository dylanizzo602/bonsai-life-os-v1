/* HabitsWidget: Up to four habits as circular streak badges on the dashboard */

import { useMemo } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DashboardBentoCard } from './DashboardBentoCard'
import { useHabits } from '../../habits/hooks/useHabits'
import { formatHabitStreakBadge } from '../../habits/formatHabitStreak'
import { getHabitMaterialIcon } from '../../habits/utils/habitDisplay'

export interface HabitsWidgetProps {
  onViewAll: () => void
}

/**
 * Habits bento widget (6-column span): four habit circles with streak badges.
 */
export function HabitsWidget({ onViewAll }: HabitsWidgetProps) {
  const { habitsWithStreaks } = useHabits()

  const four = useMemo(
    () => [...habitsWithStreaks].sort((a, b) => a.sort_order - b.sort_order).slice(0, 4),
    [habitsWithStreaks],
  )

  return (
    <DashboardBentoCard
      title="Habits"
      titleIcon={<MaterialIcon name="auto_awesome_motion" className="text-[24px] text-outline" />}
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
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full ${
                    active
                      ? 'bg-bonsai-sage-400 text-white'
                      : 'border border-dashed border-outline-variant bg-surface-container-high text-on-surface-variant/40'
                  }`}
                >
                  <MaterialIcon name={getHabitMaterialIcon(habit)} className="text-[22px]" />
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
                  className={`line-clamp-2 w-full break-words text-center text-xs font-medium leading-snug ${
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
