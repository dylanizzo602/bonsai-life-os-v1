/* BriefingSaveContinueButton: Primary footer CTA for briefing steps */

import { MaterialIcon } from '../../../components/MaterialIcon'

interface BriefingSaveContinueButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
}

/**
 * Shared Save & Continue button for briefing progress footer action slot.
 */
export function BriefingSaveContinueButton({
  onClick,
  disabled = false,
  loading = false,
  label = 'Save & Continue',
}: BriefingSaveContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center justify-center gap-2 rounded-full bg-primary px-12 py-4 text-body font-semibold text-on-primary shadow-lg shadow-primary/10 transition-all hover:bg-primary-container hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Saving…' : label}
      {!loading ? <MaterialIcon name="arrow_forward" className="text-xl" /> : null}
    </button>
  )
}
