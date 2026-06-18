/* MorningBriefingCard: CTA card for morning briefing on the home dashboard */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { useMorningBriefingBanner } from '../hooks/useMorningBriefingBanner'

interface MorningBriefingCardProps {
  onStartMorningBriefing: () => void
}

/**
 * Briefing CTA card: hidden when today's morning briefing is complete.
 */
export function MorningBriefingCard({ onStartMorningBriefing }: MorningBriefingCardProps) {
  const { needsMorningBriefing, showBanner: showMorningNudge, isLoading: morningLoading } =
    useMorningBriefingBanner()

  if (morningLoading || !needsMorningBriefing) {
    return null
  }

  const title = 'Morning Briefing'
  const description = showMorningNudge
    ? 'Finish reflecting on yesterday, then plan your day.'
    : 'Plan your day and reflect on yesterday.'

  return (
    <div className="mb-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-surface-variant bg-surface-container-low p-6 transition-shadow duration-300 hover:ambient-shadow-dashboard md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <MaterialIcon name="wb_sunny" className="text-[24px]" />
        </div>
        <div>
          <h3 className="font-headline mb-1 text-body font-medium text-on-surface">{title}</h3>
          <p className="text-body text-on-surface-variant">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onStartMorningBriefing}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-on-primary transition-colors duration-200 hover:bg-primary-container"
      >
        Start Briefing
        <MaterialIcon name="arrow_forward" className="text-[18px]" />
      </button>
    </div>
  )
}
