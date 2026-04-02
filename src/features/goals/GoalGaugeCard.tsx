/* GoalGaugeCard component: Goal card with gauge visualization for grid display */
import { GoalGauge } from './GoalGauge'
import type { Task } from '../tasks/types'
import type { Goal, GoalMilestone } from './types'
import { countFullyCompleteMilestones } from './utils/milestoneProgress'

interface GoalGaugeCardProps {
  /** Goal data to display */
  goal: Goal
  /** Milestones for this goal (for completed count) */
  milestones?: GoalMilestone[]
  /** Task trees keyed by milestone id (linked root + subtasks), for task milestone completion */
  taskTreesByMilestoneId?: Record<string, Task[]>
  /**
   * Live progress from milestones (same rules as goal detail). When set, overrides stale goal.progress from list fetch.
   */
  computedProgressPercent?: number
  /** Click handler to navigate to goal detail */
  onClick: () => void
}

/**
 * Goal gauge card component.
 * Displays goal as a card with circular gauge, name, milestone count, and dates.
 * Responsive sizing for grid layout.
 */
export function GoalGaugeCard({
  goal,
  milestones = [],
  taskTreesByMilestoneId = {},
  computedProgressPercent,
  onClick,
}: GoalGaugeCardProps) {
  /* Fully complete milestones: 100% on each milestone’s own rules (incl. task tree) */
  const completedCount = countFullyCompleteMilestones(milestones, taskTreesByMilestoneId)

  const totalCount = milestones.length

  /* Format dates for display */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  /* Prefer live aggregate when parent has milestone data; list API often has stale goal.progress */
  const displayProgress =
    computedProgressPercent !== undefined ? computedProgressPercent : goal.progress
  const progressRounded = Math.round(displayProgress)

  /* Render: Card as button so click navigates to goal detail; type="button" prevents form submit */
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white border border-bonsai-slate-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow text-left"
      aria-label={`View goal: ${goal.name}, ${progressRounded}% progress`}
    >
      {/* Gauge: percentage + title inside the circle */}
      <div className="flex flex-col items-center mb-4">
        <GoalGauge
          progress={displayProgress}
          size={120}
          className="mb-3"
        >
          <div className="px-1 min-w-0 max-w-[100px] flex flex-col items-center justify-center gap-0.5">
            <span className="text-body font-bold text-bonsai-sage-700 tabular-nums leading-tight">
              {progressRounded}%
            </span>
            <h3 className="text-secondary font-medium text-bonsai-brown-700 text-center line-clamp-2 break-words leading-snug">
              {goal.name}
            </h3>
          </div>
        </GoalGauge>
      </div>

      {/* Milestones count: completed / total */}
      {totalCount > 0 && (
        <div className="text-center mb-3">
          <span className="text-secondary text-bonsai-slate-600">
            {completedCount} / {totalCount} milestones
          </span>
        </div>
      )}

      {/* Dates: start and target */}
      <div className="flex flex-col gap-1 text-secondary text-bonsai-slate-600">
        <div className="flex items-center justify-between">
          <span className="text-xs">Start:</span>
          <span className="text-xs font-medium">{formatDate(goal.start_date)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Target:</span>
          <span className="text-xs font-medium">{formatDate(goal.target_date)}</span>
        </div>
      </div>
    </button>
  )
}
