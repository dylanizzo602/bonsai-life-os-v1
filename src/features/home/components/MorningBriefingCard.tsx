/* MorningBriefingCard: CTA card for morning and/or weekly briefing on the home dashboard */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { useMorningBriefingBanner } from '../hooks/useMorningBriefingBanner'
import { useWeeklyBriefingBanner } from '../hooks/useWeeklyBriefingBanner'

interface MorningBriefingCardProps {
  onStartMorningBriefing: () => void
  onStartWeeklyBriefing: () => void
}

/**
 * Briefing CTA card: hidden when morning (and weekly, if Sunday) are complete.
 */
export function MorningBriefingCard({
  onStartMorningBriefing,
  onStartWeeklyBriefing,
}: MorningBriefingCardProps) {
  const { needsMorningBriefing, showBanner: showMorningNudge, isLoading: morningLoading } =
    useMorningBriefingBanner()
  const { needsWeeklyBriefing, isLoading: weeklyLoading } = useWeeklyBriefingBanner()

  const isLoading = morningLoading || weeklyLoading

  const showCard = !isLoading && (needsMorningBriefing || needsWeeklyBriefing)

  if (!showCard) {
    return null
  }

  const bothIncomplete = needsMorningBriefing && needsWeeklyBriefing

  const title = bothIncomplete
    ? 'Morning & Weekly Briefing'
    : needsWeeklyBriefing
      ? 'Weekly Briefing'
      : 'Morning Briefing'

  const description = bothIncomplete
    ? 'Plan your day and reflect on your week.'
    : needsWeeklyBriefing
      ? 'Reflect on your week and set intentions.'
      : showMorningNudge
        ? 'Finish reflecting on yesterday, then plan your day.'
        : 'Plan your day and reflect on yesterday.'

  const ctaLabel = bothIncomplete
    ? 'Start Briefing'
    : needsWeeklyBriefing
      ? 'Start Weekly Briefing'
      : 'Start Briefing'

  const handleCta = () => {
    if (needsMorningBriefing) {
      onStartMorningBriefing()
    } else {
      onStartWeeklyBriefing()
    }
  }

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
        onClick={handleCta}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-on-primary transition-colors duration-200 hover:bg-primary-container"
      >
        {ctaLabel}
        <MaterialIcon name="arrow_forward" className="text-[18px]" />
      </button>
    </div>
  )
}
