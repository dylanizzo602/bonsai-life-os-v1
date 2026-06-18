/* YesterdayInReviewScreen: Celebratory review when nothing overdue from yesterday */

import { MaterialIcon } from '../../components/MaterialIcon'
import type { YesterdayReviewStats } from './utils/yesterdayReviewStats'

interface YesterdayInReviewScreenProps {
  firstName?: string | null
  stats: YesterdayReviewStats
  loading?: boolean
  onContinue: () => void
}

/**
 * Clean review path: stats from yesterday before planning the day.
 */
export function YesterdayInReviewScreen({
  firstName,
  stats,
  loading = false,
  onContinue,
}: YesterdayInReviewScreenProps) {
  const name = firstName?.trim() || 'there'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-40 pt-8 md:px-6">
      {/* Hero */}
      <div className="relative mb-8 aspect-[21/9] w-full overflow-hidden rounded-xl shadow-sm">
        <img src="/images/yesterday-review-hero.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/40 to-surface" />
      </div>

      <div className="mb-12 text-center">
        <h1 className="text-page-title mb-2 font-semibold text-on-surface">
          Great work yesterday, {name}.
        </h1>
        <p className="text-body mx-auto max-w-md text-on-surface-variant">
          Your focus is bearing fruit. Let&apos;s take a moment to look at your progress before
          starting the new day.
        </p>
      </div>

      {/* Primary stat card */}
      <div className="mb-8 w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center transition-colors hover:border-primary">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
          <MaterialIcon name="eco" className="text-3xl text-primary" filled />
        </div>
        <p className="text-page-title font-extrabold tracking-tight text-on-surface">
          {loading ? '…' : stats.tasksCompleted}
        </p>
        <h2 className="text-body font-medium text-on-surface-variant">tasks completed</h2>
        <p className="text-secondary mt-4 text-xs font-medium uppercase tracking-wide text-outline">
          Consistent momentum
        </p>
      </div>

      {/* Secondary stats */}
      <div className="mb-12 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        {stats.hasScheduledHabitsYesterday && (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
            <div className="mb-4 flex items-center gap-3">
              <MaterialIcon name="rebase_edit" className="text-secondary" />
              <span className="text-secondary text-xs font-bold uppercase tracking-wider">
                Habit Consistency
              </span>
            </div>
            <p className="text-page-title font-bold text-on-surface">
              {loading ? '…' : `${stats.habitConsistencyPercent}%`}
            </p>
            <p className="text-secondary text-on-surface-variant">of habits maintained</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-outline-variant/30">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stats.habitConsistencyPercent}%` }}
              />
            </div>
          </div>
        )}
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
          <div className="mb-4 flex items-center gap-3">
            <MaterialIcon name="flag" className="text-primary" />
            <span className="text-secondary text-xs font-bold uppercase tracking-wider">
              Goal Progress
            </span>
          </div>
          <p className="text-page-title font-bold text-on-surface">
            {loading ? '…' : stats.milestonesReached}
          </p>
          <p className="text-secondary text-on-surface-variant">milestones reached</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-body font-semibold text-on-primary shadow-md transition-all hover:bg-primary-container"
      >
        Continue to Today&apos;s Plan
        <MaterialIcon name="arrow_forward" className="text-xl" />
      </button>
      <p className="text-secondary mt-4 text-sm text-on-surface-variant">
        Takes about 2 minutes to plan your day
      </p>
    </div>
  )
}
