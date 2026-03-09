/* CompletionScreen: "Good job" and options to close briefing or see overview */

import { Button } from '../../components/Button'

interface CompletionScreenProps {
  /** Open the overview of all reflection responses */
  onViewOverview: () => void
  /** Close the briefing flow (e.g. return to home or previous section) */
  onClose?: () => void
}

/**
 * Completion step: "Good job" message with option to close the briefing or see overview of responses.
 */
export function CompletionScreen({ onViewOverview, onClose }: CompletionScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
        Good job
      </h2>
      <p className="text-body text-bonsai-slate-700 mb-8">
        Your morning briefing is complete. You can close this or review your responses below.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onClose && (
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
        <Button type="button" variant="primary" onClick={onViewOverview}>
          See overview
        </Button>
      </div>
    </div>
  )
}
