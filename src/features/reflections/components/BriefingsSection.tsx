/* BriefingsSection: Morning briefing card on the Reflect landing page */

import type { ReflectionEntry } from '../types'
import { BriefingCard } from './BriefingCard'

interface BriefingsSectionProps {
  /** Whether morning briefing is completed today */
  hasCompletedMorningToday: boolean | null
  /** Today's morning briefing entry (when completed) */
  todaysMorningEntry: ReflectionEntry | null
  /** Open the morning briefing flow; pass true to continue today's session */
  onOpenMorningBriefing?: (continueSession?: boolean) => void
}

/**
 * Briefings section: daily morning briefing card (weekly review folded into Sunday morning briefing).
 */
export function BriefingsSection({
  hasCompletedMorningToday,
  todaysMorningEntry,
  onOpenMorningBriefing,
}: BriefingsSectionProps) {
  /* Morning card: resume full flow from greeting when already completed today */
  const handleMorningClick = () => {
    if (hasCompletedMorningToday) {
      onOpenMorningBriefing?.(true)
      return
    }
    onOpenMorningBriefing?.(false)
  }

  const morningCta = hasCompletedMorningToday ? 'Continue Session' : 'Begin Briefing'

  return (
    <section className="px-0 pb-8 pt-4">
      <h2 className="pb-4 pt-2 text-body font-bold text-on-surface">Briefings</h2>
      <BriefingCard
        variant="morning"
        title="Daily Morning Briefing"
        description="Set your intentions, review your core tasks, and find your center for the day ahead. On Sundays, includes weekly reflection."
        ctaLabel={morningCta}
        cadenceLabel="Today"
        completedDate={
          hasCompletedMorningToday && todaysMorningEntry ? todaysMorningEntry.created_at : null
        }
        onClick={handleMorningClick}
      />
    </section>
  )
}
