/* GreetingScreen: First briefing step – greeting, placeholder weather/calendar, tasks due today, Begin button */

import { Button } from '../../components/Button'

interface GreetingScreenProps {
  /** Number of tasks due today (from tasks API) */
  tasksDueTodayCount: number
  /** Start the morning briefing flow */
  onBegin: () => void
}

/**
 * Greeting step: welcome message, placeholder weather, placeholder calendar count,
 * real tasks-due-today count, and "Begin morning briefing" button.
 */
export function GreetingScreen({ tasksDueTodayCount, onBegin }: GreetingScreenProps) {
  /* Placeholder: replace with real weather API later */
  const weatherPlaceholder = 'Sunny, 72°F'
  /* Placeholder: replace with real calendar integration later */
  const calendarEventCount = 3

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

        {/* Placeholder weather and calendar; real tasks count */}
        <div className="space-y-3 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
          <p className="text-body text-bonsai-slate-700">
            <span className="font-medium">Weather:</span> {weatherPlaceholder}
          </p>
          <p className="text-body text-bonsai-slate-700">
            <span className="font-medium">Calendar:</span> {calendarEventCount} events
            today
          </p>
          <p className="text-body text-bonsai-slate-700">
            <span className="font-medium">Tasks due today:</span> {tasksDueTodayCount}
          </p>
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
