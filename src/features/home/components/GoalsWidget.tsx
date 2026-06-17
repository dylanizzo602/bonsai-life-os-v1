/* GoalsWidget: Active goals with progress bars on the dashboard */

import { useMemo } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DashboardBentoCard } from './DashboardBentoCard'
import { useGoals } from '../../goals/hooks/useGoals'
import { getGoalMaterialIcon } from '../../goals/utils/goalDisplay'

export interface GoalsWidgetProps {
  onViewAll: () => void
}


/**
 * Active goals bento widget (6-column span): up to two goals with progress bars.
 */
export function GoalsWidget({ onViewAll }: GoalsWidgetProps) {
  const { goals } = useGoals()

  const two = useMemo(
    () =>
      [...goals]
        .filter((g) => g.is_active !== false)
        .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
        .slice(0, 2),
    [goals],
  )

  return (
    <DashboardBentoCard
      title="Active Goals"
      titleIcon={<MaterialIcon name="emoji_events" className="text-[24px] text-outline" />}
      className="pb-10"
    >
      {two.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No active goals yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {two.map((goal, index) => {
            const pct = Math.round(Math.min(100, Math.max(0, goal.progress ?? 0)))
            return (
              <button
                key={goal.id}
                type="button"
                onClick={onViewAll}
                className="flex w-full items-center gap-6 rounded-xl py-4 pl-0 pr-4 text-left transition-colors duration-200 hover:bg-surface-container-low"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed/30 text-bonsai-sage-400">
                  <MaterialIcon
                    name={getGoalMaterialIcon(goal, index)}
                    className="text-[24px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="truncate text-body font-medium text-on-surface">{goal.name}</h4>
                    <span className="shrink-0 text-body font-semibold text-bonsai-sage-400">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-bonsai-sage-400 shadow-[0_0_8px_rgba(125,140,124,0.3)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </DashboardBentoCard>
  )
}
