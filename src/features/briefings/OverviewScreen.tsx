/* OverviewScreen: Read-only view of a saved morning briefing (core Q&A without failures/week-in-a-life) */

import { Button } from '../../components/Button'
import type { MorningBriefingResponses } from '../reflections/types'

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

interface OverviewScreenProps {
  /** Title of the entry (e.g. "Morning briefing – Feb 19, 2025") */
  title: string | null
  /** The four reflection answers */
  responses: MorningBriefingResponses | Record<string, unknown>
  /** Go back to Briefing (e.g. to step 0 or completion) */
  onBackToBriefing: () => void
  /** Navigate to Reflections section (optional; e.g. when section lists entries) */
  onGoToReflections?: () => void
}

/** Labels for morning briefing questions (core set without failures/week-in-a-life) */
const QUESTION_LABELS: Record<keyof MorningBriefingResponses, string> = {
  memorableMoment: 'What is one memorable moment from yesterday?',
  gratefulFor: 'What is something you are grateful for?',
  didEverything: 'Did you do everything you were supposed to yesterday? If not, why?',
  whatWouldMakeEasier: 'What would make today easier?',
}

/**
 * Overview of a saved morning briefing: core questions and answers in read-only form.
 */
export function OverviewScreen({
  title,
  responses,
  onBackToBriefing,
  onGoToReflections,
}: OverviewScreenProps) {
  const r = responses as MorningBriefingResponses
  const entries = (Object.keys(QUESTION_LABELS) as (keyof MorningBriefingResponses)[]).map(
    (key) => ({ key, label: QUESTION_LABELS[key], value: r[key] ?? '' }),
  )

  return (
    <div className="flex flex-col">
      {title && (
        <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-6">
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
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={onBackToBriefing}>
          Back to Briefing
        </Button>
        {onGoToReflections && (
          <Button type="button" variant="primary" onClick={onGoToReflections}>
            See in Reflections
          </Button>
        )}
      </div>
    </div>
  )
}
