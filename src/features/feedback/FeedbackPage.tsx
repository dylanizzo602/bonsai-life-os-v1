/* FeedbackPage: Report bugs or request features with optional screenshot */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { MaterialIcon } from '../../components/MaterialIcon'
import { Textarea } from '../../components/Textarea'
import type { FeedbackType } from '../../lib/supabase/feedback'
import { useSubmitFeedback } from './hooks/useSubmitFeedback'

/** Maximum screenshot size (10 MB). */
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024

/** Minimum description length before submit. */
const MIN_MESSAGE_LENGTH = 10

type SelectedType = FeedbackType | null

const FEEDBACK_CARDS: {
  type: FeedbackType
  icon: string
  title: string
  description: string
}[] = [
  {
    type: 'bug',
    icon: 'bug_report',
    title: 'Report a Bug',
    description: 'Describe what went wrong',
  },
  {
    type: 'feature',
    icon: 'lightbulb',
    title: 'Request a Feature',
    description: 'Share an idea for improvement',
  },
]

/** True when the file is an image we can preview. */
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Feedback page: choose bug or feature, fill form, submit to support email.
 */
export function FeedbackPage() {
  /* Form state: selected type, message, optional screenshot */
  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { submitting, error, submitted, submitFeedback, resetSubmission } = useSubmitFeedback()

  /* Revoke object URL when screenshot changes or unmounts */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  /* Clear form after successful submission */
  const clearForm = useCallback(() => {
    setMessage('')
    setScreenshot(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setValidationError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [previewUrl])

  /* Card selection: reset form fields when switching type */
  const handleSelectType = (type: FeedbackType) => {
    resetSubmission()
    setSelectedType(type)
    setValidationError(null)
    if (type === 'feature') {
      setScreenshot(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /* Back: return to card picker */
  const handleBack = () => {
    resetSubmission()
    setSelectedType(null)
    clearForm()
  }

  /* Screenshot picker: validate image type and size */
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    resetSubmission()
    setValidationError(null)

    if (!isImageFile(file)) {
      setValidationError('Please attach an image file (PNG, JPG, etc.).')
      e.target.value = ''
      return
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setValidationError('Screenshot must be 10 MB or smaller.')
      e.target.value = ''
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setScreenshot(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  /* Remove attached screenshot */
  const handleRemoveScreenshot = () => {
    setScreenshot(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* Submit: validate then call hook */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetSubmission()
    setValidationError(null)

    const trimmed = message.trim()
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      setValidationError(`Please enter at least ${MIN_MESSAGE_LENGTH} characters.`)
      return
    }

    if (!selectedType) return

    const ok = await submitFeedback({
      type: selectedType,
      message: trimmed,
      screenshot: selectedType === 'bug' ? screenshot : null,
    })

    if (ok) {
      clearForm()
      setSelectedType(null)
    }
  }

  return (
    <div className="min-h-full w-full max-w-[720px] mx-auto pb-16 md:pb-24">
      {/* Page header */}
      <header className="mb-10 md:mb-12">
        <h1 className="text-page-title font-semibold font-headline tracking-tight text-on-surface">
          Feedback
        </h1>
        <p className="mt-2 max-w-xl text-secondary text-on-surface-variant">
          Report a bug or request a feature. Your message is sent directly to our support team.
        </p>
      </header>

      {/* Success message */}
      {submitted && (
        <div
          className="mb-8 rounded-xl border border-bonsai-sage-200 bg-bonsai-sage-50 px-4 py-4 md:px-6"
          role="status"
        >
          <p className="text-body font-medium text-bonsai-sage-800">
            Thank you! Your feedback has been submitted.
          </p>
          <p className="mt-1 text-secondary text-bonsai-sage-700">
            We&apos;ll review it and get back to you if needed.
          </p>
        </div>
      )}

      {/* Type selection cards */}
      {!selectedType && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEEDBACK_CARDS.map((card) => (
            <button
              key={card.type}
              type="button"
              onClick={() => handleSelectType(card.type)}
              className="flex flex-col items-start rounded-xl border border-outline-variant/25 bg-surface-container-low p-6 text-left transition-all hover:border-primary/40 hover:bg-surface-container-high hover:shadow-sm active:scale-[0.99]"
            >
              <MaterialIcon name={card.icon} className="mb-3 text-[28px] text-primary" />
              <span className="text-body font-semibold text-on-surface">{card.title}</span>
              <span className="mt-1 text-secondary text-on-surface-variant">{card.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Form area: shown after a card is selected */}
      {selectedType && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div className="flex items-center gap-2">
            <MaterialIcon
              name={selectedType === 'bug' ? 'bug_report' : 'lightbulb'}
              className="text-[22px] text-primary"
            />
            <h2 className="text-body font-semibold text-on-surface">
              {selectedType === 'bug' ? 'Report a Bug' : 'Request a Feature'}
            </h2>
          </div>

          <Textarea
            label="Description"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setValidationError(null)
              resetSubmission()
            }}
            placeholder={
              selectedType === 'bug'
                ? 'What happened? Include steps to reproduce if you can.'
                : 'Describe the feature you would like to see.'
            }
            rows={6}
            required
            disabled={submitting}
          />

          {/* Bug only: optional screenshot */}
          {selectedType === 'bug' && (
            <div className="space-y-3">
              <label className="block text-secondary font-medium text-bonsai-slate-700">
                Screenshot <span className="font-normal text-bonsai-slate-500">(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScreenshotChange}
                disabled={submitting}
              />
              {previewUrl ? (
                <div className="flex items-start gap-4">
                  <img
                    src={previewUrl}
                    alt="Screenshot preview"
                    className="max-h-40 rounded-lg border border-outline-variant/25 object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveScreenshot}
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  Attach screenshot
                </Button>
              )}
            </div>
          )}

          {/* Validation and API errors */}
          {(validationError || error) && (
            <p className="text-secondary text-red-600" role="alert">
              {validationError ?? error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleBack} disabled={submitting}>
              Back
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
