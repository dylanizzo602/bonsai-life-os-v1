/* GreetingScreen: Morning briefing step 0 — hero, bento widgets, start CTA */

import { MaterialIcon } from '../../components/MaterialIcon'
import { DEFAULT_MORNING_BRIEFING_QUOTE } from './constants/morningBriefingQuotes'

interface GreetingSummaryCardProps {
  label: string
  title: string
  icon: string
  iconClassName?: string
  metric: string
  subtitle: string
}

/** Single bento widget on the greeting screen */
function GreetingSummaryCard({
  label,
  title,
  icon,
  iconClassName = 'text-secondary',
  metric,
  subtitle,
}: GreetingSummaryCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-secondary mb-1 text-xs font-bold uppercase tracking-wider">{label}</p>
          <p className="text-body font-medium text-on-surface">{title}</p>
        </div>
        <MaterialIcon name={icon} className={iconClassName} />
      </div>
      <div className="mt-4">
        <p className="text-page-title font-semibold text-on-surface">{metric}</p>
        <p className="text-secondary text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  )
}

interface GreetingScreenProps {
  firstName?: string | null
  location?: string | null
  tasksDueTodayCount: number
  priorityTasksDueTodayCount: number
  onBegin: () => void
}

/**
 * Greeting step: personalized welcome, quote, weather/calendar/tasks bento, start briefing.
 */
export function GreetingScreen({
  firstName,
  location,
  tasksDueTodayCount,
  priorityTasksDueTodayCount,
  onBegin,
}: GreetingScreenProps) {
  const name = firstName?.trim() || 'there'
  const locationLabel = location?.trim() || 'Add location in Settings'
  const weatherHint = location?.trim() ? 'Forecast available soon' : 'Set location for weather'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-40 pt-8 md:px-6">
      {/* Hero image */}
      <div className="relative mb-8 h-64 w-full overflow-hidden rounded-xl shadow-sm">
        <img
          src="/images/morning-briefing-hero.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
      </div>

      {/* Greeting + quote */}
      <section className="mb-12 w-full text-center">
        <h1 className="text-page-title mb-3 font-semibold text-primary">
          Good morning, {name}.
        </h1>
        <p className="text-body mx-auto max-w-2xl italic text-on-surface-variant">
          &ldquo;{DEFAULT_MORNING_BRIEFING_QUOTE}&rdquo;
        </p>
      </section>

      {/* Bento widgets */}
      <div className="mb-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        <GreetingSummaryCard
          label="Current Weather"
          title={locationLabel}
          icon="wb_sunny"
          iconClassName="text-secondary"
          metric="—"
          subtitle={weatherHint}
        />
        <GreetingSummaryCard
          label="Schedule"
          title="Today's Events"
          icon="calendar_today"
          iconClassName="text-primary"
          metric="—"
          subtitle="Coming soon"
        />
        <GreetingSummaryCard
          label="Tasks"
          title="Daily Goals"
          icon="task_alt"
          iconClassName="text-tertiary"
          metric={`${tasksDueTodayCount} task${tasksDueTodayCount === 1 ? '' : 's'}`}
          subtitle={
            priorityTasksDueTodayCount > 0
              ? `${priorityTasksDueTodayCount} priority item${priorityTasksDueTodayCount === 1 ? '' : 's'} require attention`
              : 'No priority items due today'
          }
        />
      </div>

      {/* Start CTA */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onBegin}
          className="rounded-full bg-primary px-10 py-4 text-body font-semibold text-on-primary shadow-lg shadow-primary/10 transition-all hover:bg-primary-container active:scale-95"
        >
          Start Morning Briefing
        </button>
        <p className="text-secondary text-xs font-bold uppercase tracking-wider text-outline">
          Takes approximately 4 minutes
        </p>
      </div>
    </div>
  )
}
