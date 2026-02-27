/* GoalsProgressScreen: Weekly briefing step 2 – review goals progress and update */

import { Button } from '../../components/Button'
import { GoalGauge } from '../goals/GoalGauge'
import type { Goal, GoalMilestone } from '../goals/types'

interface GoalsProgressScreenProps {
  /** Goals to display with progress */
  goals: Goal[]
  /** Optional milestones per goal for "X / Y milestones" display */
  milestonesByGoal?: Record<string, GoalMilestone[]>
  /** Open goal detail to update progress (parent shows GoalDetailPage in-context) */
  onUpdateProgress: (goalId: string) => void
  /** Advance to next step */
  onNext: () => void
}

/* Compute completed milestone count for display (same logic as GoalGaugeCard) */
function completedMilestoneCount(milestones: GoalMilestone[]): number {
  return milestones.filter((m) => {
    if (m.type === 'task') return m.completed
    if (m.type === 'number')
      return (
        m.current_value != null &&
        m.target_value != null &&
        m.current_value >= m.target_value
      )
    return m.completed
  }).length
}

/**
 * Goals progress step: "Review goals progress."
 * One section per goal with progress % and "Update progress"; Next goes to task cleanup.
 */
export function GoalsProgressScreen({
  goals,
  milestonesByGoal = {},
  onUpdateProgress,
  onNext,
}: GoalsProgressScreenProps) {
  return (
    <div className="flex min-h-[50vh] flex-col justify-between">
      <div>
        {/* Heading */}
        <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
          Review goals progress.
        </h2>
        <p className="text-body text-bonsai-slate-700 mb-6">
          Go goal by goal and update any progress.
        </p>

        {/* Goals list or empty state */}
        {goals.length === 0 ? (
          <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-6">
            <p className="text-body text-bonsai-slate-600">
              No goals yet. Create goals in the Goals section to track progress here.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {goals.map((goal) => {
              const milestones = milestonesByGoal[goal.id] ?? []
              const completed = completedMilestoneCount(milestones)
              const total = milestones.length
              return (
                <li
                  key={goal.id}
                  className="rounded-lg border border-bonsai-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {/* Goal name and gauge */}
                    <div className="flex items-center gap-4">
                      <GoalGauge progress={goal.progress} size={56} />
                      <div>
                        <h3 className="text-body font-semibold text-bonsai-brown-700">
                          {goal.name}
                        </h3>
                        {total > 0 && (
                          <p className="text-secondary text-bonsai-slate-600">
                            {completed} / {total} milestones
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Update progress button */}
                    <div className="shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateProgress(goal.id)}
                      >
                        Update progress
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Next button */}
      <div className="mt-8">
        <Button type="button" onClick={onNext} variant="primary" className="w-full">
          Next
        </Button>
      </div>
    </div>
  )
}
