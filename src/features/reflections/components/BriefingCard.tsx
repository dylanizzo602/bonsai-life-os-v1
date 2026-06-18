/* BriefingCard: Clickable card for morning or weekly briefing on the Reflect landing page */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { formatEntryDate } from '../utils/entryDisplay'

/** Days until the upcoming Sunday (0 when today is Sunday) */
function getDaysUntilSunday(): number {
  const dayOfWeek = new Date().getDay()
  return (7 - dayOfWeek) % 7
}

interface BriefingCardProps {
  /** Card variant: morning daily briefing or weekly review */
  variant: 'morning' | 'weekly'
  /** Card title */
  title: string
  /** Short description shown below the title */
  description: string
  /** CTA link text at the bottom of the card */
  ctaLabel: string
  /** Cadence label (e.g. "Today", "Weekly") */
  cadenceLabel: string
  /** When set, shows completion chip with this date */
  completedDate?: string | null
  /** Called when the user clicks the card */
  onClick: () => void
}

/**
 * Briefing card for the Reflect landing page Briefings grid.
 * Reusable for daily morning briefing and weekly review CTAs.
 */
export function BriefingCard({
  variant,
  title,
  description,
  ctaLabel,
  cadenceLabel,
  completedDate,
  onClick,
}: BriefingCardProps) {
  /* Icon styling: morning uses primary-fixed; weekly uses secondary-fixed */
  const iconWrapClass =
    variant === 'morning'
      ? 'bg-primary-fixed text-primary'
      : 'bg-secondary-fixed text-secondary'

  const iconName = variant === 'morning' ? 'wb_sunny' : 'calendar_view_week'
  const daysUntilSunday = variant === 'weekly' ? getDaysUntilSunday() : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-6 text-left transition-colors hover:bg-surface-container cursor-pointer"
    >
      {/* Header row: icon and status/cadence labels */}
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${iconWrapClass}`}>
          <MaterialIcon name={iconName} className="text-[24px]" />
        </div>
        <div className="flex items-center gap-2">
          {completedDate && (
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#4F5D50]">
              <MaterialIcon name="check_circle" className="text-xs" />
              <span>Completed {formatEntryDate(completedDate)}</span>
            </div>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
            {cadenceLabel}
          </span>
          {daysUntilSunday !== null && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
              Due in {daysUntilSunday} {daysUntilSunday === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>
      </div>

      {/* Title and description */}
      <div>
        <h3 className="text-body font-bold text-on-surface">{title}</h3>
        <p className="mt-1 text-secondary text-on-surface-variant">{description}</p>
      </div>

      {/* CTA row */}
      <div className="mt-2 flex items-center gap-1 text-xs font-bold text-primary">
        {ctaLabel}
        <MaterialIcon name="chevron_right" className="text-sm" />
      </div>
    </button>
  )
}
