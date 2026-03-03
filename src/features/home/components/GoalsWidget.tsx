/* GoalsWidget: 3 random goals with name and progress gauge */

import { useMemo } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { useGoals } from '../../goals/hooks/useGoals'
import { GoalGauge } from '../../goals/GoalGauge'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export interface GoalsWidgetProps {
  onViewAll: () => void
}

/**
 * Goals widget: 3 random active goals with gauge and name.
 * Inactive goals remain visible only in the main Goals section.
 */
export function GoalsWidget({ onViewAll }: GoalsWidgetProps) {
  const { goals } = useGoals()
  /* Pick up to three active goals (inactive goals are excluded from the widget) */
  const three = useMemo(
    () => shuffle(goals.filter((g) => g.is_active !== false)).slice(0, 3),
    [goals],
  )

  return (
    <DashboardWidget
      title="Goals"
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
        <p className="text-secondary text-bonsai-slate-500">No goals yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {three.map((goal) => (
            <div
              key={goal.id}
              className="flex flex-col items-center rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4"
            >
              <GoalGauge progress={goal.progress ?? 0} size={80} className="mb-2" />
              <p className="text-body font-medium text-bonsai-brown-700 text-center">{goal.name}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardWidget>
  )
}
