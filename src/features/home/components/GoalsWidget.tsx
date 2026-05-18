/* GoalsWidget: Active goals with progress bars on the dashboard */

import { useMemo } from 'react'
import { DashboardBentoCard } from './DashboardBentoCard'
import { useGoals } from '../../goals/hooks/useGoals'
import { GoalsIcon, TrophyIcon } from '../../../components/icons'

export interface GoalsWidgetProps {
  onViewAll: () => void
}

/**
 * Active goals bento widget: up to two goals with progress bars.
 */
export function GoalsWidget({ onViewAll }: GoalsWidgetProps) {
  const { goals } = useGoals()

  /* Active goals sorted by progress descending */
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
      titleIcon={<GoalsIcon className="h-6 w-6" />}
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
      {two.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No active goals yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {two.map((goal) => {
            const pct = Math.round(Math.min(100, Math.max(0, goal.progress ?? 0)))
            return (
              <button
                key={goal.id}
                type="button"
                onClick={onViewAll}
                className="flex w-full items-center gap-6 rounded-xl p-4 text-left transition-colors hover:bg-surface-container-low"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed/30 text-bonsai-sage-400">
                  <TrophyIcon className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                        Goal
                      </span>
                      <h4 className="truncate font-medium text-on-surface">{goal.name}</h4>
                    </div>
                    <span className="shrink-0 text-body font-semibold text-bonsai-sage-400">{pct}%</span>
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
