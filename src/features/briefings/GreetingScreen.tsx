/* GreetingScreen: First briefing step – greeting, quick summary of today (weather placeholder, real calendar + tasks), Begin button */

import { Button } from '../../components/Button'

interface GreetingScreenProps {
  /** Number of tasks due today (from tasks API) */
  tasksDueTodayCount: number
  /** Number of calendar events today across all configured calendars */
  calendarEventCount: number
  /** True while calendar feeds are loading */
  calendarLoading: boolean
  /** Optional brief calendar error to show inline */
  calendarError: string | null
  /** Start the morning briefing flow */
  onBegin: () => void
}

/**
 * Greeting step: welcome message, placeholder weather, real calendar agenda count,
 * real tasks-due-today count, and "Begin morning briefing" button.
 */
export function GreetingScreen({
  tasksDueTodayCount,
  calendarEventCount,
  calendarLoading,
  calendarError,
  onBegin,
}: GreetingScreenProps) {
  /* Placeholder: replace with real weather API later */
  const weatherPlaceholder = 'Sunny, 72°F'

  return (
    <div className="flex min-h-[50vh] flex-col justify-between">
      <div>
        {/* Greeting: time-based or generic */}
        <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
          Good morning
        </h2>
        <p className="text-body text-bonsai-slate-700 mb-6">
          Here’s a quick look at your day.
        </p>

        {/* Today summary: placeholder weather, real calendar count, real tasks count */}
        <div className="space-y-3 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
          <p className="text-body text-bonsai-slate-700">
            <span className="font-medium">Weather:</span> {weatherPlaceholder}
          </p>
          <p className="text-body text-bonsai-slate-700">
            <span className="font-medium">Calendar:</span>{' '}
            {calendarLoading
              ? 'Loading events…'
              : `${calendarEventCount} event${calendarEventCount === 1 ? '' : 's'} today`}
          </p>
          <p className="text-body text-bonsai-slate-700">
            <span className="font-medium">Tasks due today:</span> {tasksDueTodayCount}
          </p>
          {calendarError && (
            <p className="text-secondary text-bonsai-slate-500">
              {calendarError}
            </p>
          )}
        </div>
      </div>

      {/* Begin button */}
      <div className="mt-8">
        <Button type="button" onClick={onBegin} variant="primary" className="w-full">
          Begin morning briefing
        </Button>
      </div>
    </div>
  )
}

