/* MorningBriefingCard: CTA card for morning and/or weekly briefing on the home dashboard */

import { ChevronRightIcon } from '../../../components/icons'
import { useMorningBriefingBanner } from '../hooks/useMorningBriefingBanner'
import { useWeeklyBriefingBanner } from '../hooks/useWeeklyBriefingBanner'

interface MorningBriefingCardProps {
  onStartMorningBriefing: () => void
  onStartWeeklyBriefing: () => void
}

/** Sun icon for briefing card */
function SunIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zM11 2v2h2V2h-2zm0 18v2h2v-2h-2zM5.99 4.58l-1.41-1.41-1.42 1.41 1.41 1.41 1.42-1.41zm12.37 12.37-1.41-1.41-1.42 1.41 1.41 1.41 1.42-1.41zm1.42-14.78-1.42 1.41 1.41 1.41 1.42-1.41-1.41-1.41zM5.99 19.42l1.41 1.41 1.42-1.41-1.41-1.41-1.42 1.41z" />
    </svg>
  )
}

/**
 * Briefing CTA card: hidden when morning (and weekly, if Sunday) are complete;
 * combined copy when both are still due on Sunday.
 */
export function MorningBriefingCard({
  onStartMorningBriefing,
  onStartWeeklyBriefing,
}: MorningBriefingCardProps) {
  const { needsMorningBriefing, showBanner: showMorningNudge, isLoading: morningLoading } =
    useMorningBriefingBanner()
  const { needsWeeklyBriefing, isLoading: weeklyLoading } = useWeeklyBriefingBanner()

  const isLoading = morningLoading || weeklyLoading

  /* Visibility: hide once morning is done and weekly is not required or also done */
  const showCard =
    !isLoading && (needsMorningBriefing || needsWeeklyBriefing)

  if (!showCard) {
    return null
  }

  const bothIncomplete = needsMorningBriefing && needsWeeklyBriefing

  /* Title and body copy by which briefings are still due */
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
          <SunIcon />
        </div>
        <div>
          <h3 className="mb-1 text-body font-medium text-on-surface">{title}</h3>
          <p className="text-body text-on-surface-variant">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCta}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-on-primary transition-colors hover:bg-primary-container"
      >
        {ctaLabel}
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
