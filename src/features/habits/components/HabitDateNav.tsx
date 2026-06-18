/* HabitDateNav: Chevron prev/next day control with friendly date label */

import { MaterialIcon } from '../../../components/MaterialIcon'

export interface HabitDateNavProps {
  /** Display label (e.g. Today, Yesterday) */
  label: string
  onPrev: () => void
  onNext: () => void
  /** Open date picker when the label is clicked */
  onOpenDatePicker: () => void
}

/**
 * Compact date navigation for the Habits page header.
 */
export function HabitDateNav({ label, onPrev, onNext, onOpenDatePicker }: HabitDateNavProps) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
      <button
        type="button"
        onClick={onPrev}
        className="rounded-full p-1 text-on-surface-variant transition-colors hover:text-primary"
        aria-label="Previous day"
      >
        <MaterialIcon name="chevron_left" />
      </button>
      <button
        type="button"
        onClick={onOpenDatePicker}
        className="min-w-[60px] text-center text-secondary font-semibold text-on-surface transition-colors hover:text-primary"
        aria-label="Open date picker"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full p-1 text-on-surface-variant transition-colors hover:text-primary"
        aria-label="Next day"
      >
        <MaterialIcon name="chevron_right" />
      </button>
    </div>
  )
}
