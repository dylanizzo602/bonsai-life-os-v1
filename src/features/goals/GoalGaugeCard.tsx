/* GoalGaugeCard component: Goal card with gauge visualization for grid display */
import { GoalGauge } from './GoalGauge'
import type { Goal, GoalMilestone } from './types'

interface GoalGaugeCardProps {
  /** Goal data to display */
  goal: Goal
  /** Milestones for this goal (for completed count) */
  milestones?: GoalMilestone[]
  /** Click handler to navigate to goal detail */
  onClick: () => void
}

/**
 * Goal gauge card component.
 * Displays goal as a card with circular gauge, name, milestone count, and dates.
 * Responsive sizing for grid layout.
 */
export function GoalGaugeCard({ goal, milestones = [], onClick }: GoalGaugeCardProps) {
  /* Calculate completed milestones count */
  const completedCount = milestones.filter((m) => {
    if (m.type === 'task') {
      return m.completed
    } else if (m.type === 'number') {
      return (
        m.current_value != null &&
        m.target_value != null &&
        m.current_value >= m.target_value
      )
    } else {
      return m.completed
    }
  }).length

  const totalCount = milestones.length

  /* Format dates for display */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  /* Use computed progress if available, otherwise use manual progress */
  const displayProgress = goal.progress

  /* Render: Card as button so click navigates to goal detail; type="button" prevents form submit */
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white border border-bonsai-slate-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow text-left"
      aria-label={`View goal: ${goal.name}`}
    >
      {/* Gauge and goal name: centered */}
      <div className="flex flex-col items-center mb-4">
        <GoalGauge
          progress={displayProgress}
          size={120}
          className="mb-3"
        >
          <div className="px-2">
            <h3 className="text-body font-semibold text-bonsai-brown-700 text-center line-clamp-2">
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
