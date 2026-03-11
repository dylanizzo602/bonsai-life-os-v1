/* ReflectionQuestionScreen: One reflection question per step with rich text editor */

import { Button } from '../../components/Button'
import { RichTextEditor } from '../notes/RichTextEditor'

interface ReflectionQuestionScreenProps {
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
      <div className="flex gap-3">
        {showBack && onBack && (
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="button" variant="primary" onClick={onNext} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  )
}
