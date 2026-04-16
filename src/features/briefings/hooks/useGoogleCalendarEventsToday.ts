/* useGoogleCalendarEventsToday hook: Fetch today's Google Calendar events via edge function */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseUrl } from '../../../lib/supabase/client'
import type { CalendarAgendaEvent } from '../types'

interface GoogleCalendarAgendaEventDto {
  title: string
  location?: string
  start: string
  end?: string
  isAllDay?: boolean
  busyStatus?: 'busy' | 'free'
  source?: string
}

interface UseGoogleCalendarEventsTodayReturn {
  /** True while the request is in flight */
  loading: boolean
  /** True when the server indicates the user has a stored refresh token */
  connected: boolean
  /** Optional user-facing error message */
  error: string | null
  /** Today's events (empty when not connected or none today) */
  eventsToday: CalendarAgendaEvent[]
  /** Count of today's events for quick summary */
  countToday: number
  /** Manual refresh (useful after returning from OAuth redirect) */
  refetch: () => Promise<void>
}

type FunctionInvokeHeaders = Record<string, string>
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

/**
 * Hook that calls the server-side Google Calendar API and normalizes the response into CalendarAgendaEvent.
 * Keeps tokens server-side; browser only receives event metadata needed for the briefing.
 */
export function useGoogleCalendarEventsToday(): UseGoogleCalendarEventsTodayReturn {
  /* Local state: loading, connection status, error message, and events */
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarAgendaEvent[]>([])

  /* Auth header: build a plain string map that matches Supabase function invoke typings */
  const getAuthHeaders = useCallback(async (): Promise<FunctionInvokeHeaders> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  /* Direct function fetch: include apikey + bearer explicitly so auth is guaranteed at the HTTP layer */
  const callFunction = useCallback(async <T>(name: string, body: unknown, headers: FunctionInvokeHeaders): Promise<{
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
  }, [])

  /* Request: fetch events and translate DTO into CalendarAgendaEvent */
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      const result = await callFunction<{
        events?: GoogleCalendarAgendaEventDto[]
      }>('google-calendar-events-today', {}, headers)
      const data = result.data
      const fnError = result.error

      if (fnError) {
        const status = fnError.status
        if (status === 404) {
          setConnected(false)
          setEvents([])
          setError(null)
          return
        }

        setConnected(false)
        setEvents([])
        setError('Unable to load Google Calendar events right now.')
        return
      }

      const normalized: CalendarAgendaEvent[] = (data?.events ?? [])
        .map((ev) => ({
          title: ev.title,
          location: ev.location,
          start: new Date(ev.start),
          end: ev.end ? new Date(ev.end) : undefined,
          isAllDay: ev.isAllDay,
          busyStatus: ev.busyStatus,
          source: ev.source ?? 'Google',
        }))
        .filter((ev) => !Number.isNaN(ev.start.getTime()))

      normalized.sort((a, b) => a.start.getTime() - b.start.getTime())
      setConnected(true)
      setEvents(normalized)
    } finally {
      setLoading(false)
    }
  }, [callFunction, getAuthHeaders])

  /* Initial fetch: load events if connected; 404 => not connected */
  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  /* Derived count for summary usage */
  const countToday = useMemo(() => events.length, [events])

  return {
    loading,
    connected,
    error,
    eventsToday: events,
    countToday,
    refetch: fetchEvents,
  }
}
