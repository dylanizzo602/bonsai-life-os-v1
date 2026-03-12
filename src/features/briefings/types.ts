/* Briefings types: Shared types for morning briefing calendar agenda and related UI */

export interface CalendarAgendaEvent {
  /** Event title/summary text */
  title: string
  /** Optional event location/where field */
  location?: string
  /** Event start time as a Date (local) */
  start: Date
  /** Optional event end time as a Date (local) */
  end?: Date
  /** Whether this is an all-day event (DATE-only DTSTART in ICS) */
  isAllDay?: boolean
  /** Whether the time should be treated as busy or free (derived from ICS transparency/busy status) */
  busyStatus?: 'busy' | 'free'
  /** Source label (e.g. Google, Microsoft, Apple) for display/debugging */
  source?: string
}

