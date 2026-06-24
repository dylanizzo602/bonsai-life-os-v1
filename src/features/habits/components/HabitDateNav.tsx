/* HabitDateNav: Chevron prev/next day control with friendly date label */

import { MaterialIcon } from '../../../components/MaterialIcon'

export interface HabitDateNavProps {
  /** Display label (e.g. Today, Yesterday) */
  label: string
  onPrev: () => void
  onNext: () => void
  /** Open date picker when the label is clicked */
  onOpenDatePicker: () => void
  /** Optional wrapper classes (e.g. flex growth on mobile) */
  className?: string
}

/**
 * Compact date navigation for the Habits page header.
 */
export function HabitDateNav({
  label,
  onPrev,
  onNext,
  onOpenDatePicker,
  className = '',
}: HabitDateNavProps) {
  return (
    <div
      className={`flex h-12 items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 ${className}`}
    >
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
        className="min-w-0 flex-1 truncate text-center text-secondary font-semibold text-on-surface transition-colors hover:text-primary sm:min-w-[60px] sm:flex-none"
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
