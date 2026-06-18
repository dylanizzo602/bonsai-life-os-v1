/* useSubmitFeedback hook: Upload optional screenshot and submit feedback via edge function */

import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { submitFeedbackRequest, type FeedbackType } from '../../../lib/supabase/feedback'
import { uploadFeedbackScreenshot } from '../../../lib/supabase/storage'

interface SubmitFeedbackInput {
  type: FeedbackType
  message: string
  screenshot?: File | null
}

interface UseSubmitFeedbackReturn {
  submitting: boolean
  error: string | null
  submitted: boolean
  submitFeedback: (input: SubmitFeedbackInput) => Promise<boolean>
  resetSubmission: () => void
}

/**
 * Hook for submitting bug reports and feature requests.
 * Handles optional screenshot upload then calls the submit-feedback edge function.
 */
export function useSubmitFeedback(): UseSubmitFeedbackReturn {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  /* Reset success/error state when user starts a new submission flow */
  const resetSubmission = useCallback(() => {
    setSubmitted(false)
    setError(null)
  }, [])

  /* Submit handler: upload screenshot if present, then invoke edge function */
  const submitFeedback = useCallback(
    async ({ type, message, screenshot }: SubmitFeedbackInput): Promise<boolean> => {
      if (!user?.id) {
        setError('You must be signed in to submit feedback.')
        return false
      }

      setSubmitting(true)
      setError(null)

      try {
        let storagePath: string | undefined
        if (screenshot) {
          storagePath = await uploadFeedbackScreenshot(user.id, screenshot)
        }

        await submitFeedbackRequest({
          type,
          message: message.trim(),
          storagePath,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        })

        setSubmitted(true)
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to submit feedback.'
        setError(msg)
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [user?.id],
  )

  return {
    submitting,
    error,
    submitted,
    submitFeedback,
    resetSubmission,
  }
}
