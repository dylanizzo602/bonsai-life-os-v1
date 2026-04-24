/* GreetingScreen: First briefing step – greeting, quick summary of today (weather placeholder, real calendar + tasks), Begin button */

import { Button } from '../../components/Button'
import type { MorningBriefingResponses, ReflectionEntry } from '../reflections/types'

/* Escape HTML for plain-text reflections so we can safely render older entries alongside rich text ones */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/* Convert a reflection answer into display HTML, treating TipTap-style HTML as-is and older plain text with escaped characters and <br /> for newlines */
function reflectionValueToHtml(value: string): string {
  if (!value?.trim()) return ''
  const looksLikeHtml = /<\s*(p|ul|ol|li|strong|em|h1|h2|br|div)[\s>]/i.test(value)
  if (looksLikeHtml) return value
  return escapeHtml(value).replace(/\n/g, '<br />')
}

/** Labels for morning briefing questions (core set without failures/week-in-a-life) */
const QUESTION_LABELS: Record<keyof MorningBriefingResponses, string> = {
  memorableMoment: 'What is one memorable moment from yesterday?',
  gratefulFor: 'What is something you are grateful for?',
  didEverything: 'Did you do everything you were supposed to yesterday? If not, why?',
  whatWouldMakeEasier: 'What would make today easier?',
}

interface GreetingScreenProps {
  /** Number of tasks due today (from tasks API) */
  tasksDueTodayCount: number
  /** Number of calendar events today across all configured calendars */
  calendarEventCount: number
  /** True while calendar feeds are loading */
  calendarLoading: boolean
  /** Optional brief calendar error to show inline */
  calendarError: string | null
  /** Optional: random "X years ago today" reflection entry for a nostalgic prompt */
  yearsAgoEntry: { entry: ReflectionEntry; yearsAgo: number } | null
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
  yearsAgoEntry,
  onBegin,
}: GreetingScreenProps) {
  /* Placeholder: replace with real weather API later */
  const weatherPlaceholder = 'Sunny, 72°F'

  /* Years-ago content: normalize responses into the core morning briefing shape */
  const yearsAgoResponses = (() => {
    const responses = yearsAgoEntry?.entry.responses
    if (responses == null || typeof responses !== 'object' || Array.isArray(responses)) return null
    return responses as MorningBriefingResponses
  })()

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

        {/* Years ago today: optional nostalgic prompt */}
        <div className="mt-4 rounded-lg border border-bonsai-slate-200 bg-white p-4">
          <p className="text-body font-medium text-bonsai-brown-700 mb-1">
            {yearsAgoEntry
              ? `${yearsAgoEntry.yearsAgo} year${yearsAgoEntry.yearsAgo === 1 ? '' : 's'} ago today…`
              : 'Years ago today…'}
          </p>

          {yearsAgoEntry && yearsAgoResponses ? (
            <div className="space-y-4">
              {(Object.keys(QUESTION_LABELS) as (keyof MorningBriefingResponses)[]).map((key) => {
                /* Answer extraction: show the full entry answer for this question */
                const value = yearsAgoResponses[key] ?? ''
                return (
                  <div key={key}>
                    <p className="text-secondary font-medium text-bonsai-slate-700 mb-1">
                      {QUESTION_LABELS[key]}
                    </p>
                    {value ? (
                      <div
                        className="text-body text-bonsai-slate-800"
                        dangerouslySetInnerHTML={{ __html: reflectionValueToHtml(value) }}
                      />
                    ) : (
                      <p className="text-body text-bonsai-slate-800">—</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-secondary text-bonsai-slate-500">No entry from years ago today.</p>
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

