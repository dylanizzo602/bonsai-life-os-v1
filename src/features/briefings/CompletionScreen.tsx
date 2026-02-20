/* CompletionScreen: "You're all done" and button to view overview */

import { Button } from '../../components/Button'

interface CompletionScreenProps {
  /** Open the overview of all reflection responses */
  onViewOverview: () => void
}

/**
 * Completion step: congratulatory message and button to view morning briefing overview.
 */
export function CompletionScreen({ onViewOverview }: CompletionScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
        You're all done
      </h2>
      <p className="text-body text-bonsai-slate-700 mb-8">
        Your morning briefing is complete. You can review your responses below or in the Reflections section anytime.
      </p>
      <Button type="button" variant="primary" onClick={onViewOverview}>
        View overview
      </Button>
    </div>
  )
}
