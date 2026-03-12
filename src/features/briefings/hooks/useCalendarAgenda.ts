/* useCalendarAgenda hook: Fetch and parse ICS calendar feeds into today's agenda events for morning briefing */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import type { CalendarAgendaEvent } from '../types'

interface UseCalendarAgendaOptions {
  /** Optional mapping of provider key to ICS URL so we can label sources in the UI */
  urlsBySource: Partial<Record<'google' | 'microsoft' | 'apple' | 'other', string>>
}

interface UseCalendarAgendaReturn {
  /** True while one or more feeds are loading */
  loading: boolean
  /** Optional aggregated error message when all feeds fail */
  error: string | null
  /** All events that occur today across all configured calendars */
  eventsToday: CalendarAgendaEvent[]
  /** Count of today events for quick summary (e.g. greeting step) */
  countToday: number
}

/**
 * Parse an ICS date/datetime value into a local Date instance and flag for all-day.
 * Handles DATE (YYYYMMDD), local DATE-TIME (YYYYMMDDTHHmmss), and UTC (ending in Z).
 */
function parseIcsDate(value: string): { date: Date; isAllDay: boolean } | null {
  if (!value) return null

  const [raw, tzPart] = value.split(';')
  const normalized = tzPart ? raw : value
  const v = normalized.trim()

  // DATE value (all-day event): YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    const year = Number(v.slice(0, 4))
    const month = Number(v.slice(4, 6)) - 1
    const day = Number(v.slice(6, 8))
    const d = new Date(year, month, day)
    return Number.isNaN(d.getTime()) ? null : { date: d, isAllDay: true }
  }

  // DATE-TIME value: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const match = /^(\d{8})T(\d{6})(Z?)$/.exec(v)
  if (!match) return null

  const [, datePart, timePart, isUtc] = match
  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6)) - 1
  const day = Number(datePart.slice(6, 8))
  const hour = Number(timePart.slice(0, 2))
  const minute = Number(timePart.slice(2, 4))
  const second = Number(timePart.slice(4, 6))

  if (isUtc) {
    const ms = Date.UTC(year, month, day, hour, minute, second)
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : { date: d, isAllDay: false }
  }

  const d = new Date(year, month, day, hour, minute, second)
  return Number.isNaN(d.getTime()) ? null : { date: d, isAllDay: false }
}

/**
 * Unfold ICS lines by joining continuation lines (those starting with a single space).
 */
function unfoldIcsLines(raw: string): string[] {
  const lines = raw.split(/\r?\n/)
  const result: string[] = []
  for (const line of lines) {
    if (!line) continue
    if (line.startsWith(' ') && result.length > 0) {
      result[result.length - 1] += line.slice(1)
    } else {
      result.push(line)
    }
  }
  return result
}

/**
 * Parse an ICS feed string into a list of events.
 * Very small, focused parser that supports the fields we need for an agenda.
 */
function parseIcsEvents(ics: string, source?: string): CalendarAgendaEvent[] {
  const lines = unfoldIcsLines(ics)
  const events: CalendarAgendaEvent[] = []
  let inEvent = false
  let current: Partial<CalendarAgendaEvent> & {
    rawStart?: string
    rawEnd?: string
    rawTransp?: string
    rawBusyStatus?: string
  } = {}

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true
      current = {}
      continue
    }
    if (line.startsWith('END:VEVENT')) {
      if (inEvent && current.title && current.rawStart) {
        const startParsed = parseIcsDate(current.rawStart)
        const endParsed = current.rawEnd ? parseIcsDate(current.rawEnd) : undefined
        if (startParsed) {
          const busyStatus: 'busy' | 'free' | undefined = (() => {
            const transp = (current.rawTransp ?? '').toUpperCase()
            const busy = (current.rawBusyStatus ?? '').toUpperCase()
            if (busy === 'FREE') return 'free'
            if (busy === 'BUSY' || busy === 'OOF' || busy === 'TENTATIVE') return 'busy'
            if (transp === 'TRANSPARENT') return 'free'
            if (transp === 'OPAQUE') return 'busy'
            return undefined
          })()

          events.push({
            title: current.title,
            location: current.location,
            start: startParsed.date,
            end: endParsed?.date,
            isAllDay: startParsed.isAllDay,
            busyStatus,
            source,
          })
        }
      }
      inEvent = false
      current = {}
      continue
    }
    if (!inEvent) continue

    const idx = line.indexOf(':')
    if (idx === -1) continue
    const nameWithParams = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const name = nameWithParams.split(';')[0].toUpperCase()

    if (name === 'SUMMARY') {
      current.title = value
    } else if (name === 'LOCATION') {
      current.location = value
    } else if (name === 'DTSTART') {
      current.rawStart = value
    } else if (name === 'DTEND') {
      current.rawEnd = value
    } else if (name === 'TRANSP') {
      current.rawTransp = value
    } else if (name === 'X-MICROSOFT-CDO-BUSYSTATUS') {
      current.rawBusyStatus = value
    }
  }

  return events
}

/**
 * Filter events down to those that occur today (based on local time).
 */
function filterEventsForToday(allEvents: CalendarAgendaEvent[]): CalendarAgendaEvent[] {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()

  return allEvents.filter((ev) => {
    const s = ev.start.getTime()
    const e = ev.end ? ev.end.getTime() : s

    // Only include portions that intersect with [00:00, 23:59:59.999] today
    const latestStart = Math.max(s, startMs)
    const earliestEnd = Math.min(e, endMs)
    return latestStart <= earliestEnd
  })
}

/**
 * Hook that fetches and aggregates ICS events across configured calendar URLs, then exposes today's events.
 */
export function useCalendarAgenda({ urlsBySource }: UseCalendarAgendaOptions): UseCalendarAgendaReturn {
  /* Local loading/error state for aggregated calendar fetches */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allEvents, setAllEvents] = useState<CalendarAgendaEvent[]>([])

  useEffect(() => {
    const entries = Object.entries(urlsBySource).filter(
      ([, url]) => typeof url === 'string' && url.trim().length > 0,
    )
    if (entries.length === 0) {
      setAllEvents([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const results = await Promise.allSettled(
          entries.map(async ([sourceKey, url]) => {
            const trimmed = (url ?? '').trim()
            if (!trimmed) return [] as CalendarAgendaEvent[]

            // Normalize common calendar URL schemes for server-side fetching via Supabase edge function.
            const normalizedTargetUrl = trimmed.replace(/^webcal:/i, 'https:')

            const { data, error } = await supabase.functions.invoke<string>(
              'calendar-ics-proxy',
              {
                body: { url: normalizedTargetUrl },
                // Use responseType 'text' so the edge function's text/calendar response is handled correctly; cast to any to satisfy SDK typings.
                responseType: 'text',
              } as any,
            )

            if (error) {
              console.error('Calendar ICS proxy error for source', sourceKey, error)
              throw error
            }

            const text = data ?? ''
            const sourceLabel =
              sourceKey === 'google'
                ? 'Google'
                : sourceKey === 'microsoft'
                  ? 'Microsoft'
                  : sourceKey === 'apple'
                    ? 'Apple'
                    : undefined
            return parseIcsEvents(text, sourceLabel)
          }),
        )

        if (cancelled) return

        const merged: CalendarAgendaEvent[] = []
        let anySuccess = false
        let anyFailure = false
        let firstErrorMessage: string | null = null

        for (const r of results) {
          if (r.status === 'fulfilled') {
            merged.push(...r.value)
            if (r.value.length > 0) anySuccess = true
          } else {
            anyFailure = true
            if (!firstErrorMessage) {
              const reason = r.reason as unknown
              firstErrorMessage =
                (reason as { message?: string })?.message ?? String(reason ?? 'Unknown error')
            }
          }
        }

        merged.sort((a, b) => a.start.getTime() - b.start.getTime())
        setAllEvents(merged)

        if (!anySuccess && anyFailure) {
          setError(
            `Unable to load any calendar events. Check your calendar links and network. Details: ${firstErrorMessage}`,
          )
        } else if (anyFailure) {
          setError(
            `Some calendars could not be loaded. Check your calendar links if events are missing. Details: ${firstErrorMessage}`,
          )
        } else {
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Calendar agenda unexpected error', err)
        setAllEvents([])
        setError('Unable to load calendar events. Check your calendar links and network.')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [urlsBySource.google, urlsBySource.microsoft, urlsBySource.apple, urlsBySource.other])

  const eventsToday = useMemo(() => filterEventsForToday(allEvents), [allEvents])

  return {
    loading,
    error,
    eventsToday,
    countToday: eventsToday.length,
  }
}

