/* CompletedGoalsList: displays past completed/archived goals for an identity */

import type { Goal } from '../types'

export interface CompletedGoalsListProps {
  /** Past completed goals (already filtered by goal.is_active=false) */
  goals: Array<Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>>
  /** Called when user clicks a goal in the list */
  onOpenGoal: (goalId: string) => void
}

function formatProgress(progress: number | null | undefined): string {
  const value = typeof progress === 'number' ? progress : 0
  return `${value}%`
}

export function CompletedGoalsList({ goals, onOpenGoal }: CompletedGoalsListProps) {
  return (
    <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-3 md:p-4">
      <h3 className="text-secondary font-semibold text-bonsai-brown-700 mb-2">Past completed goals</h3>

      {goals.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500">No completed goals yet.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenGoal(g.id)}
                  className="text-body font-medium text-bonsai-brown-700 hover:underline text-left break-words"
                >
                  {g.name}
                </button>
                <p className="text-secondary text-bonsai-slate-600 text-xs mt-0.5">
                  Progress: {formatProgress(g.progress)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

