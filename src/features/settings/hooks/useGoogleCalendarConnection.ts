/* useGoogleCalendarConnection hook: Connect/disconnect Google Calendar via Supabase Edge Functions */
import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseUrl } from '../../../lib/supabase/client'

interface UseGoogleCalendarConnectionReturn {
  /** True while connect/disconnect/status request is in flight */
  loading: boolean
  /** Whether the user appears connected (best-effort based on events endpoint) */
  connected: boolean
  /** Optional message to show under the controls */
  message: string | null
  /** Start OAuth flow by redirecting the browser */
  startConnect: () => Promise<void>
  /** Disconnect by deleting server-side token row */
  disconnect: () => Promise<void>
  /** Refresh connected state (best-effort) */
  refreshStatus: () => Promise<void>
}

type FunctionInvokeHeaders = Record<string, string>
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

/**
 * Hook to manage Google Calendar connection state.
 * Uses edge functions so refresh tokens never reach the browser.
 */
export function useGoogleCalendarConnection(): UseGoogleCalendarConnectionReturn {
  /* Local state: connection status + transient message for the Settings UI */
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  /* Auth header: build a plain string map that matches Supabase function invoke typings */
  const getAuthHeaders = async (): Promise<FunctionInvokeHeaders> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /* Direct function fetch: include apikey + bearer explicitly so auth is guaranteed at the HTTP layer */
  const callFunction = async <T>(name: string, body: unknown, headers: FunctionInvokeHeaders): Promise<{
    status: number
    data: T | null
    error: { status: number; message: string } | null
  }> => {
    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        ...headers,
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }

    if (!response.ok) {
      return {
        status: response.status,
        data: null,
        error: {
          status: response.status,
          message:
            typeof parsed === 'object' && parsed && 'message' in parsed
              ? String((parsed as { message?: unknown }).message ?? 'Request failed')
              : typeof parsed === 'string' && parsed
                ? parsed
                : 'Request failed',
        },
      }
    }

    return { status: response.status, data: (parsed as T) ?? null, error: null }
  }

  /* Error formatting: surface useful details from Supabase function invocation errors */
  const formatFunctionError = (err: unknown, fallback: string): string => {
    const status = (err as any)?.status
    const name = (err as any)?.name
    const msg = (err as any)?.message
    const pieces = [fallback]
    if (typeof status === 'number') pieces.push(`(status ${status})`)
    if (typeof name === 'string' && name.trim()) pieces.push(name.trim())
    if (typeof msg === 'string' && msg.trim()) pieces.push(msg.trim())
    return pieces.join(' ')
  }

  /* Helper: best-effort status check by calling events endpoint (does not return tokens) */
  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)

      const headers = await getAuthHeaders()
      const result = await callFunction<unknown>('google-calendar-events-today', {}, headers)
      const error = result.error
      if (!error) {
        setConnected(true)
        return
      }

      const status = error?.status
      if (status === 404) {
        setConnected(false)
        return
      }

      setConnected(false)
      setMessage(formatFunctionError(error, 'Unable to check Google Calendar connection right now.'))
    } finally {
      setLoading(false)
    }
  }, [])

  /* Connect: request auth URL then redirect */
  const startConnect = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)

      const headers = await getAuthHeaders()
      const result = await callFunction<{ url?: string }>('google-oauth-start', { returnTo: '/?section=settings' }, headers)
      const data = result.data
      const error = result.error

      if (error) {
        setMessage(formatFunctionError(error, 'Unable to start Google Calendar connection.'))
        return
      }

      const url = data?.url ?? ''
      if (!url) {
        setMessage('Unable to start Google Calendar connection (missing URL).')
        return
      }

      window.location.href = url
    } finally {
      setLoading(false)
    }
  }, [])

  /* Disconnect: delete token row server-side */
  const disconnect = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)

      const headers = await getAuthHeaders()
      const result = await callFunction<unknown>('google-calendar-disconnect', {}, headers)
      const error = result.error
      if (error) {
        setMessage(formatFunctionError(error, 'Unable to disconnect Google Calendar right now.'))
        return
      }

      setConnected(false)
      setMessage('Google Calendar disconnected.')
    } finally {
      setLoading(false)
    }
  }, [])

  /* Initial status check: populate UI on mount */
  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  return {
    loading,
    connected,
    message,
    startConnect,
    disconnect,
    refreshStatus,
  }
}
