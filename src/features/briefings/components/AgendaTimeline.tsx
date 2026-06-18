/* AgendaTimeline: Today's calendar events in a vertical timeline */

import { MaterialIcon } from '../../../components/MaterialIcon'
import type { CalendarAgendaEvent } from '../types'

interface AgendaTimelineProps {
  events: CalendarAgendaEvent[]
  loading: boolean
  error: string | null
}

/** Format start time for timeline label */
function formatEventTime(event: CalendarAgendaEvent): string {
  if (event.isAllDay) return 'All day'
  return event.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** True for long busy blocks (focus-style accent) */
function isFocusBlock(event: CalendarAgendaEvent): boolean {
  if (event.isAllDay || event.busyStatus === 'free') return false
  const end = event.end ?? event.start
  const minutes = (end.getTime() - event.start.getTime()) / 60000
  return minutes >= 60
}

/**
 * Vertical agenda timeline for the plan-day step.
 */
export function AgendaTimeline({ events, loading, error }: AgendaTimelineProps) {
  const sorted = [...events].sort((a, b) => {
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
    return a.start.getTime() - b.start.getTime()
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-body flex items-center gap-2 font-medium text-on-surface">
          <MaterialIcon name="calendar_today" className="text-primary" />
          Your Agenda
        </h2>
      </div>

      {loading ? (
        <p className="text-secondary text-on-surface-variant">Loading today&apos;s events…</p>
      ) : sorted.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No events today</p>
      ) : (
        <div className="space-y-0">
          {sorted.map((ev, index) => {
            const focus = isFocusBlock(ev)
            return (
              <div key={`${ev.title}-${ev.start.toISOString()}-${index}`} className="relative flex gap-6 pb-8">
                <div className="relative flex shrink-0 flex-col items-center">
                  <div className="relative z-10 mt-1.5 h-4 w-4 rounded-full border-2 border-primary bg-surface" />
                  {index < sorted.length - 1 && (
                    <div className="absolute left-1/2 top-6 bottom-0 w-px -translate-x-1/2 bg-outline-variant" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-secondary mb-1 block text-xs font-bold uppercase tracking-widest text-outline">
                    {formatEventTime(ev)}
                  </span>
                  <div
                    className={
                      focus
                        ? 'rounded-lg border-2 border-primary/20 bg-primary-container/10 p-4'
                        : 'rounded-lg border border-outline-variant/30 bg-surface-container-low p-4'
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-body font-medium ${focus ? 'text-primary' : 'text-on-surface'}`}>
                        {ev.title}
                      </h3>
                      {focus && <MaterialIcon name="lock" className="text-sm text-primary" />}
                    </div>
                    {ev.location ? (
                      <p className="text-secondary mt-1 text-sm text-on-surface-variant">{ev.location}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error ? <p className="text-secondary mt-2 text-on-surface-variant">{error}</p> : null}
    </div>
  )
}
