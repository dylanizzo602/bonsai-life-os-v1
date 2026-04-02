/* ReflectionQuestionScreen: One reflection question per step with rich text editor */

import type { ReactNode } from 'react'
import { BriefingFooter } from './BriefingFooter'
import { RichTextEditor } from '../notes/RichTextEditor'

interface ReflectionQuestionScreenProps {
  /** Optional content above the question (e.g. habit table for context) */
  aboveQuestion?: ReactNode
  /** Question text */
  question: string
  /** Current answer value */
  value: string
  /** Update answer */
  onChange: (value: string) => void
  /** Go to next step */
  onNext: () => void
  /** Go back (optional; not shown on first reflection step) */
  onBack?: () => void
  /** Whether this is the first reflection step (hide Back) */
  showBack?: boolean
}

/**
 * Single reflection question: label + textarea + Next (and optional Back).
 */
export function ReflectionQuestionScreen({
  aboveQuestion,
  question,
  value,
  onChange,
  onNext,
  onBack,
  showBack = true,
}: ReflectionQuestionScreenProps) {
  /* Container: max-w-full and box-border so briefing text box is not cut off on the sides */
  return (
    <div className="flex flex-col w-full max-w-full box-border px-1">
      {/* Optional context (e.g. habits grid) before the prompt and answer */}
      {aboveQuestion != null ? (
        <div className="mb-6 w-full min-w-0">{aboveQuestion}</div>
      ) : null}
      <h3 className="text-body font-semibold text-bonsai-brown-700 mb-4">
        {question}
      </h3>
      {/* Answer input: Rich text editor so reflections can include basic formatting */}
      <RichTextEditor
        editorKey={`reflection-${question}`}
        value={value}
        onBlur={(html) => onChange(html)}
        placeholder="Type your thoughts here..."
        className="mb-6"
      />
      <BriefingFooter onBack={showBack ? onBack : undefined} onNext={onNext} />
    </div>
  )
}
