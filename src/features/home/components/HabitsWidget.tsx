/* HabitsWidget: 3 random habits with streak (flame + number) */

import { useMemo } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { useHabits } from '../../habits/hooks/useHabits'
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export interface HabitsWidgetProps {
  onViewAll: () => void
}

/**
 * Habits widget: 3 random habits with name and current streak.
 */
export function HabitsWidget({ onViewAll }: HabitsWidgetProps) {
  const { habitsWithStreaks } = useHabits()
  const three = useMemo(
    () => shuffle(habitsWithStreaks).slice(0, 3),
    [habitsWithStreaks],
  )

  return (
    <DashboardWidget
      title="Habits"
      actions={
        <button
          type="button"
          onClick={onViewAll}
          className="text-secondary font-medium text-bonsai-sage-700 hover:underline"
        >
          View All
        </button>
      }
    >
      {three.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500">No habits yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {three.map((habit) => (
            <div
              key={habit.id}
              className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 px-4 py-3"
            >
              <p className="text-body font-medium text-bonsai-brown-700">{habit.name}</p>
              <p className="text-secondary text-bonsai-slate-600 mt-1" role="img" aria-label="streak">
                🔥 {habit.currentStreak}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardWidget>
  )
}
