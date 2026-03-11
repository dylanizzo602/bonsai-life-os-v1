/* ReflectionEntryView: Read-only display of one reflection entry (e.g. morning briefing Q&A without failures/week-in-a-life) */

import { Button } from '../../components/Button'
import type { MorningBriefingResponses } from './types'

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

interface ReflectionEntryViewProps {
  /** Title of the entry (e.g. "Morning briefing – Feb 19, 2025") */
  title: string | null
  /** The stored responses (e.g. four morning briefing answers) */
  responses: MorningBriefingResponses | Record<string, unknown>
  /** Label for the back button */
  backLabel?: string
  /** Called when user clicks back */
  onBack: () => void
}

/** Labels for morning briefing questions (core set without failures/week-in-a-life) */
const QUESTION_LABELS: Record<keyof MorningBriefingResponses, string> = {
  memorableMoment: 'What is one memorable moment from yesterday?',
  gratefulFor: 'What is something you are grateful for?',
  didEverything: 'Did you do everything you were supposed to yesterday? If not, why?',
  whatWouldMakeEasier: 'What would make today easier?',
}

/**
 * Displays a single reflection entry (title + Q&A). Used in Reflections list detail and in Briefing overview.
 */
export function ReflectionEntryView({
  title,
  responses,
  backLabel = 'Back to list',
  onBack,
}: ReflectionEntryViewProps) {
  const r = responses as MorningBriefingResponses
  const entries = (Object.keys(QUESTION_LABELS) as (keyof MorningBriefingResponses)[]).map(
    (key) => ({ key, label: QUESTION_LABELS[key], value: r[key] ?? '' }),
  )

  return (
    <div className="flex flex-col">
      {title && (
        <h2 className="text-body font-bold text-bonsai-brown-700 mb-6">
          {title}
        </h2>
      )}
      <div className="space-y-6 mb-8">
        {entries.map(({ key, label, value }) => (
          <div key={key}>
            <p className="text-secondary font-medium text-bonsai-slate-700 mb-1">
              {label}
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
        ))}
      </div>
      <Button type="button" variant="secondary" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  )
}
