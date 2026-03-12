/* BriefingFooter: Shared bottom navigation with optional Back and primary Next buttons */

import { Button } from '../../components/Button'

interface BriefingFooterProps {
  /** Optional handler for going back to the previous step */
  onBack?: () => void
  /** Handler for advancing to the next step */
  onNext: () => void
  /** Label for the Next button (defaults to "Next") */
  nextLabel?: string
  /** Label for the Back button (defaults to "Back") */
  backLabel?: string
  /** Optional disabled state for the Next button */
  isNextDisabled?: boolean
  /** Optional loading state for the Next button */
  isNextLoading?: boolean
}

/**
 * Shared footer for briefing steps: Back on the left, Next on the right.
 * On small screens buttons stack, but Back remains visually above and to the left of Next where space allows.
 */
export function BriefingFooter({
  onBack,
  onNext,
  nextLabel = 'Next',
  backLabel = 'Back',
  isNextDisabled,
  isNextLoading,
}: BriefingFooterProps) {
  /* Layout: stack on mobile, side-by-side on larger screens with Back to the left of Next */
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="sm:flex-1">
        {onBack && (
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            className="w-full sm:w-auto"
          >
            {backLabel}
          </Button>
        )}
      </div>
      <div className="sm:flex-1 sm:flex sm:justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          disabled={isNextDisabled}
          className="w-full sm:w-auto"
        >
          {isNextLoading ? 'Next…' : nextLabel}
        </Button>
      </div>
    </div>
  )
}

