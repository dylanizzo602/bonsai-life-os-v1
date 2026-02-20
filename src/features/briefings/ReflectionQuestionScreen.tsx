/* ReflectionQuestionScreen: One reflection question per step with textarea */

import { Button } from '../../components/Button'
import { Textarea } from '../../components/Textarea'

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
  return (
    <div className="flex flex-col">
      <h3 className="text-body font-semibold text-bonsai-brown-700 mb-4">
        {question}
      </h3>
      <Textarea
        label="Your response"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your thoughts here..."
        rows={5}
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
