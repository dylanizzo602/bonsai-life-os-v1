/* GoalReflectionEntryView: Read-only display of a goal completion reflection */

import { Button } from '../../../components/Button'
import { GOAL_REFLECTION_SUCCESS_QUESTION } from '../../goals/constants/goalReflection'
import type { GoalReflectionResponses } from '../types'

/* Escape HTML for plain-text reflections */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/* Convert a reflection answer into display HTML */
function reflectionValueToHtml(value: string): string {
  if (!value?.trim()) return ''
  const looksLikeHtml = /<\s*(p|ul|ol|li|strong|em|h1|h2|br|div)[\s>]/i.test(value)
  if (looksLikeHtml) return value
  return escapeHtml(value).replace(/\n/g, '<br />')
}

interface GoalReflectionEntryViewProps {
  title: string | null
  responses: GoalReflectionResponses
  backLabel?: string
  onBack: () => void
}

/**
 * Displays a goal completion reflection (goal title + success question answer).
 */
export function GoalReflectionEntryView({
  title,
  responses,
  backLabel = 'Back to list',
  onBack,
}: GoalReflectionEntryViewProps) {
  const answer = responses.whatContributedToSuccess ?? ''

  return (
    <div className="flex flex-col">
      {title ? (
        <h2 className="text-body mb-2 font-bold text-bonsai-brown-700">{title}</h2>
      ) : null}
      <p className="text-secondary mb-6 text-bonsai-slate-500">Goal reflection</p>

      <div className="mb-8">
        <p className="text-secondary mb-1 font-medium text-bonsai-slate-700">
          {GOAL_REFLECTION_SUCCESS_QUESTION}
        </p>
        {answer ? (
          <div
            className="text-body text-bonsai-slate-800"
            dangerouslySetInnerHTML={{ __html: reflectionValueToHtml(answer) }}
          />
        ) : (
          <p className="text-body text-bonsai-slate-800">—</p>
        )}
      </div>

      <Button type="button" variant="secondary" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  )
}
