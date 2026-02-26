/* DateRangeBar: Prev / date range text / Next for habit week navigation. Used by HabitTable and HabitTableV1. */

import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'

export interface DateRangeBarProps {
  /** Display text for the current range (e.g. "Feb 15 – Feb 21, 2026") */
  dateRangeText: string
  onPrev: () => void
  onNext: () => void
  /** Optional extra class for the bar container */
  className?: string
}

/**
 * Date bar with previous/next buttons and centered date range label.
 * Accessible (aria-labels) and consistent focus ring for keyboard users.
 */
export function DateRangeBar({ dateRangeText, onPrev, onNext, className = '' }: DateRangeBarProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-2 border-b border-bonsai-slate-200 bg-bonsai-slate-50 ${className}`.trim()}
      role="group"
      aria-label="Week navigation"
    >
      <button
        type="button"
        onClick={onPrev}
        className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded touch-manipulation"
        aria-label="Previous week"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <span className="text-body font-medium text-bonsai-slate-700 min-w-[180px] text-center">
        {dateRangeText}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded touch-manipulation"
        aria-label="Next week"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
