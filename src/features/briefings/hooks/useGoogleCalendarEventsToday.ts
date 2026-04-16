/* useGoogleCalendarEventsToday hook: Fetch today's Google Calendar events via edge function */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
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

  /* Auth header: ensure edge function calls include the current session access token */
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  /* Request: fetch events and translate DTO into CalendarAgendaEvent */
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      const { data, error: fnError } = await supabase.functions.invoke<{
        events?: GoogleCalendarAgendaEventDto[]
      }>('google-calendar-events-today', { body: {}, headers })

      if (fnError) {
        const status = (fnError as any)?.status
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
  }, [getAuthHeaders])

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
