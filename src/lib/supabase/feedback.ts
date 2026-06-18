/* Feedback data access: Submit bug reports and feature requests via edge function */

import { supabase, supabaseUrl } from './client'

export type FeedbackType = 'bug' | 'feature'

export interface SubmitFeedbackPayload {
  /** Report category */
  type: FeedbackType
  /** User message body */
  message: string
  /** Optional screenshot path in feedback-screenshots bucket */
  storagePath?: string
  /** Current page URL for context */
  pageUrl?: string
}

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

/**
 * POST feedback to the submit-feedback edge function (authenticated).
 */
export async function submitFeedbackRequest(payload: SubmitFeedbackPayload): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ''
  if (!token) {
    throw new Error('You must be signed in to submit feedback.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/submit-feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed && 'error' in parsed
        ? String((parsed as { error?: unknown }).error ?? 'Failed to submit feedback')
        : typeof parsed === 'string' && parsed
          ? parsed
          : 'Failed to submit feedback'
    throw new Error(message)
  }
}
