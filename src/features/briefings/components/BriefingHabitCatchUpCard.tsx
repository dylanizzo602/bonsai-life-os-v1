/* BriefingHabitCatchUpCard: Unfinished habit card with Target / Min / Skip */

import type { HabitWithStreaks } from '../../habits/types'

interface BriefingHabitCatchUpCardProps {
  habit: HabitWithStreaks
  hasMinimumAction: boolean
  onTargetComplete: () => void
  onMinimum: () => void
  onSkip: () => void
  actionsDisabled?: boolean
}

/**
 * Habit catch-up card for the missed-items briefing step.
 */
export function BriefingHabitCatchUpCard({
  habit,
  hasMinimumAction,
  onTargetComplete,
  onMinimum,
  onSkip,
  actionsDisabled = false,
}: BriefingHabitCatchUpCardProps) {
  const subtitle =
    habit.minimum_action?.trim() ||
    habit.desired_action?.trim() ||
    habit.description?.trim() ||
    ''

  return (
    <div className="rounded-xl border border-transparent bg-surface-container-low p-4 transition-all hover:border-outline-variant">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span className="text-body font-semibold">{habit.name.slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-body font-semibold leading-tight text-on-surface">{habit.name}</p>
          {subtitle ? (
            <p className="text-secondary truncate text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={onTargetComplete}
          className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          Target
        </button>
        {hasMinimumAction && (
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={onMinimum}
            className="rounded-lg border border-outline/30 px-4 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-variant disabled:opacity-50"
          >
            Minimum
          </button>
        )}
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={onSkip}
          className="rounded-lg border border-outline/30 px-4 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-variant disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
