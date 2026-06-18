/* BriefingsSection: Grid of morning and weekly briefing cards on the Reflect landing page */

import type { ReflectionEntry } from '../types'
import { BriefingCard } from './BriefingCard'

interface BriefingsSectionProps {
  /** Whether morning briefing is completed today */
  hasCompletedMorningToday: boolean | null
  /** Whether weekly briefing is completed this week */
  hasCompletedWeeklyThisWeek: boolean | null
  /** Today's morning briefing entry (when completed) */
  todaysMorningEntry: ReflectionEntry | null
  /** Open the morning briefing flow */
  onOpenMorningBriefing?: () => void
  /** Open the weekly briefing flow */
  onOpenWeeklyBriefing?: () => void
  /** Open today's completed morning entry in detail view */
  onOpenTodaysMorningEntry?: (entry: ReflectionEntry) => void
}

/**
 * Briefings section: two-card grid for daily morning briefing and weekly review.
 */
export function BriefingsSection({
  hasCompletedMorningToday,
  hasCompletedWeeklyThisWeek,
  todaysMorningEntry,
  onOpenMorningBriefing,
  onOpenWeeklyBriefing,
  onOpenTodaysMorningEntry,
}: BriefingsSectionProps) {
  /* Morning card click: open today's entry if done, otherwise start briefing */
  const handleMorningClick = () => {
    if (hasCompletedMorningToday && todaysMorningEntry && onOpenTodaysMorningEntry) {
      onOpenTodaysMorningEntry(todaysMorningEntry)
      return
    }
    onOpenMorningBriefing?.()
  }

  const morningCta =
    hasCompletedMorningToday ? 'Continue Session' : 'Begin Briefing'

  const weeklyCta =
    hasCompletedWeeklyThisWeek ? 'Continue Review' : 'Begin Review'

  return (
    <section className="px-0 pb-8 pt-4">
      <h2 className="pb-4 pt-2 text-body font-bold text-on-surface">Briefings</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BriefingCard
          variant="morning"
          title="Daily Morning Briefing"
          description="Set your intentions, review your core tasks, and find your center for the day ahead."
          ctaLabel={morningCta}
          cadenceLabel="Today"
          completedDate={
            hasCompletedMorningToday && todaysMorningEntry
              ? todaysMorningEntry.created_at
              : null
          }
          onClick={handleMorningClick}
        />
        <BriefingCard
          variant="weekly"
          title="Weekly Review"
          description="Reflect on the past seven days, evaluate your progress, and recalibrate for next week."
          ctaLabel={weeklyCta}
          cadenceLabel="Weekly"
          onClick={() => onOpenWeeklyBriefing?.()}
        />
      </div>
    </section>
  )
}
