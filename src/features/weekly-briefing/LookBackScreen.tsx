/* LookBackScreen: Weekly briefing step 1 – look back on last week (tasks completed + habit streaks) */

import { Button } from '../../components/Button'
import { HabitStreakSummary } from '../habits/HabitStreakSummary'
import type { HabitWithStreaks } from '../habits/types'

interface LookBackScreenProps {
  /** Number of tasks completed in the last 7 days */
  tasksCompletedLastWeek: number
  /** Current habits with streak info for display */
  habitsWithStreaks: HabitWithStreaks[]
  /** Whether tasks count is still loading */
  loading?: boolean
  /** Advance to next step */
  onNext: () => void
}

/**
 * Look-back step: "Let's look back on last week."
 * Shows tasks completed count and current streaks for all habits; Next goes to goals progress.
 */
export function LookBackScreen({
  tasksCompletedLastWeek,
  habitsWithStreaks,
  loading = false,
  onNext,
}: LookBackScreenProps) {
  /* Section: Tasks completed last week */
  const tasksStat = loading ? (
    <p className="text-body text-bonsai-slate-600">Loading…</p>
  ) : (
    <p className="text-body text-bonsai-slate-700">
      You completed <strong>{tasksCompletedLastWeek}</strong> task{tasksCompletedLastWeek !== 1 ? 's' : ''} last week.
    </p>
  )

  return (
    <div className="flex min-h-[50vh] flex-col justify-between">
      <div>
        {/* Heading */}
        <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
          Let&apos;s look back on last week.
        </h2>

        {/* Tasks completed stat */}
        <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4 mb-6">
          <p className="text-secondary font-medium text-bonsai-slate-700 mb-1">Tasks completed</p>
          {tasksStat}
        </div>

        {/* Habit streaks */}
        <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
          <p className="text-secondary font-medium text-bonsai-slate-700 mb-3">Current habit streaks</p>
          {habitsWithStreaks.length === 0 ? (
            <p className="text-body text-bonsai-slate-600">No habits yet. Add habits to track streaks here.</p>
          ) : (
            <ul className="space-y-2">
              {habitsWithStreaks.map((habit) => (
                <li key={habit.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between text-body text-bonsai-slate-700 border-b border-bonsai-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className="font-medium">{habit.name}</span>
                  <HabitStreakSummary habit={habit} showLongest={false} variant="compact" />
                </li>
              ))}
            </ul>
          )}
        </div>
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
