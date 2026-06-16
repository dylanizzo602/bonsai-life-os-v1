/* CompletedGoalsForest: "The Forest" grid of completed goals with tree imagery */
import { MaterialIcon } from '../../components/MaterialIcon'
import type { Goal } from './types'
import { formatGoalCompletionMonth, getCompletedGoalTreeSrc } from './utils/goalDisplay'

interface CompletedGoalsForestProps {
  /** Goals at 100% progress */
  goals: Goal[]
  /** Open goal detail when a tree is clicked */
  onOpenGoal: (goalId: string) => void
}

/**
 * Completed goals section with circular tree visuals and hover check badge.
 */
export function CompletedGoalsForest({ goals, onOpenGoal }: CompletedGoalsForestProps) {
  if (goals.length === 0) return null

  return (
    <section className="bonsai-gradient rounded-xl border border-primary/5 p-8 md:p-12">
      {/* Section header */}
      <div className="mb-12 text-center md:mb-20">
        <h2 className="text-page-title font-headline font-extrabold tracking-tight text-on-surface">
          Completed Goals
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-body leading-relaxed text-on-surface-variant/80">
          A visual testament to your growth and steady persistence.
        </p>
      </div>

      {/* Tree grid */}
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12 lg:grid-cols-5">
        {goals.map((goal) => (
          <button
            key={goal.id}
            type="button"
            onClick={() => onOpenGoal(goal.id)}
            className="group flex flex-col items-center text-center"
            aria-label={`View completed goal: ${goal.name}`}
          >
            {/* Circular tree image with hover glow and check badge */}
            <div className="relative mb-4 h-32 w-32">
              <div className="absolute inset-0 scale-125 rounded-full bg-primary/5 opacity-0 transition-all duration-700 group-hover:opacity-100" />
              <img
                src={getCompletedGoalTreeSrc(goal.id)}
                alt=""
                className="h-full w-full rounded-full object-cover shadow-sm transition-all duration-500 group-hover:shadow-xl"
              />
              <div className="absolute -bottom-2 -right-2 rounded-full bg-primary p-1 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                <MaterialIcon name="check" className="text-xs text-on-primary" filled />
              </div>
            </div>

            <span className="text-body font-semibold text-on-surface">{goal.name}</span>
            <span className="mt-1 text-[10px] font-bold uppercase text-outline">
              {formatGoalCompletionMonth(goal)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
