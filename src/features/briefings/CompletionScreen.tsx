/* CompletionScreen: Immersive briefing finish at 100% progress */

import { MaterialIcon } from '../../components/MaterialIcon'
import { BriefingShell } from './components/BriefingShell'
import { BriefingProgressFooter } from './components/BriefingProgressFooter'

interface CompletionScreenProps {
  /** Open the overview of all reflection responses */
  onViewOverview: () => void
  /** Close the briefing flow (e.g. return to home or previous section) */
  onClose?: () => void
}

/**
 * Completion step: celebratory finish with 100% progress and exit options.
 */
export function CompletionScreen({ onViewOverview, onClose }: CompletionScreenProps) {
  return (
    <>
      <BriefingShell>
        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          {onClose != null ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Close briefing"
            >
              <MaterialIcon name="close" className="text-on-surface-variant" />
            </button>
          ) : null}

          {/* Hero accent */}
          <div className="relative mb-10 h-48 w-full overflow-hidden rounded-xl md:h-56">
            <img
              src="/images/morning-briefing-hero.jpg"
              alt=""
              className="h-full w-full object-cover brightness-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed shadow-lg">
                <MaterialIcon name="eco" className="text-4xl text-primary" filled />
              </div>
            </div>
          </div>

          <h1 className="text-page-title mb-4 font-semibold text-on-surface">
            You&apos;re ready for today.
          </h1>
          <p className="text-body mx-auto mb-10 max-w-md text-on-surface-variant">
            Your morning briefing is complete. You&apos;ve reviewed, planned, and reflected — now go
            tend what matters.
          </p>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-primary px-8 py-4 text-body font-semibold text-on-primary shadow-lg shadow-primary/10 transition-all hover:bg-primary-container"
              >
                Close
              </button>
            ) : null}
            <button
              type="button"
              onClick={onViewOverview}
              className="flex-1 rounded-xl border border-outline-variant px-8 py-4 text-body font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              See overview
            </button>
          </div>
        </div>
      </BriefingShell>

      {/* Full progress bar at 100% */}
      <BriefingProgressFooter percentComplete={100} />
    </>
  )
}
