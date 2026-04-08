/* PlanDayScreen: Today's calendar agenda on the left; right = Pick 3 for Today's Lineup + first 5 available tasks */

import { Button } from '../../components/Button'
import { CompactTaskItem } from '../tasks/CompactTaskItem'
import { BriefingFooter } from './BriefingFooter'
import type { Task } from '../tasks/types'
import type { CalendarAgendaEvent } from './types'

interface PlanDayScreenProps {
  /** First 5 tasks from "available" view (not completed, not blocked, start <= now) */
  availableTasks: Task[]
  /** Task IDs currently in Today's Lineup */
  lineUpTaskIds: Set<string>
  /** Today's calendar agenda events across configured calendars */
  calendarEvents: CalendarAgendaEvent[]
  /** True while calendar feeds are loading */
  calendarLoading: boolean
  /** Optional brief calendar error to show inline under the list */
  calendarError: string | null
  /** Add task to Today's Lineup */
  onAddToLineUp: (taskId: string) => void
  /** Remove task from Today's Lineup */
  onRemoveFromLineUp: (taskId: string) => void
  /** Open full task editor (same modal as Tasks section) */
  onEditTask: (task: Task) => void
  /** Go back to the previous step */
  onBack?: () => void
  /** Go to next step */
  onNext: () => void
}

/**
 * Plan your day step: left = today's merged calendar agenda; right = prompt to pick 3 tasks + first 5 available.
 * Uses same Today's Lineup storage as Tasks section (date-scoped, resets daily).
 */
export function PlanDayScreen({
  availableTasks,
  lineUpTaskIds,
  calendarEvents,
  calendarLoading,
  calendarError,
  onAddToLineUp,
  onRemoveFromLineUp,
  onEditTask,
  onBack,
  onNext,
}: PlanDayScreenProps) {
  /* Today window: clamp all event times to 00:00–23:59 today for display */
  const todayStart = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })()
  const todayEnd = (() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  })()

  /* Local formatter: render a short time range or all-day label for each event */
  const formatEventTimeRange = (event: CalendarAgendaEvent): string => {
    if (event.isAllDay) {
      return 'All day'
    }

    const start = event.start < todayStart ? todayStart : event.start
    const effectiveEnd = event.end ?? todayEnd
    const end = effectiveEnd > todayEnd ? todayEnd : effectiveEnd

    const startLabel = start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    const endLabel = end.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })

    return `${startLabel} – ${endLabel}`
  }

  /* Local formatter: turn a duration in minutes into a human-readable string (e.g. 1h 30m) */
  const formatDuration = (minutesTotal: number): string => {
    if (minutesTotal <= 0) return ''
    const hours = Math.floor(minutesTotal / 60)
    const minutes = minutesTotal % 60
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h`
    return `${minutes}m`
  }

  /* Derived list: sort all-day events to the top, then by start time within today */
  const sortedCalendarEvents: CalendarAgendaEvent[] = [...calendarEvents].sort((a, b) => {
    const aAllDay = a.isAllDay ? 1 : 0
    const bAllDay = b.isAllDay ? 1 : 0
    if (aAllDay !== bAllDay) return bAllDay - aAllDay
    return a.start.getTime() - b.start.getTime()
  })

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-8">
      {/* Left: Today's calendar agenda */}
      <div>
        <h3 className="text-body font-semibold text-bonsai-brown-700 mb-3">
          Today&apos;s calendar
        </h3>
        <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
          {calendarLoading ? (
            <p className="text-secondary text-bonsai-slate-600">Loading today&apos;s events…</p>
          ) : sortedCalendarEvents.length === 0 ? (
            <p className="text-secondary text-bonsai-slate-600">No events today</p>
          ) : (
            <div className="space-y-3">
              {sortedCalendarEvents.map((ev, index) => {
                const start = ev.start < todayStart ? todayStart : ev.start
                const effectiveEnd = ev.end ?? todayEnd
                const end = effectiveEnd > todayEnd ? todayEnd : effectiveEnd
                const durationMinutes = Math.max(
                  0,
                  Math.round((end.getTime() - start.getTime()) / (60 * 1000)),
                )
                const durationLabel = formatDuration(durationMinutes)
                const busyLabel = ev.busyStatus === 'free' ? 'Free' : 'Busy'

                return (
                  <div
                    key={`${ev.title}-${ev.start.toISOString()}-${index}`}
                    className="rounded-lg border border-bonsai-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-body font-semibold text-bonsai-brown-700">
                        {ev.title}{' '}
                        <span className="text-secondary text-bonsai-slate-600">
                          ({busyLabel})
                        </span>
                      </p>
                    </div>
                    <p className="text-secondary text-bonsai-slate-600">
                      {formatEventTimeRange(ev)}
                      {durationLabel && ` · ${durationLabel}`}
                    </p>
                    {ev.location && (
                      <p className="text-secondary text-bonsai-slate-600 mt-1">{ev.location}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {calendarError && (
            <p className="mt-3 text-secondary text-bonsai-slate-500">
              {calendarError}
            </p>
          )}
        </div>
      </div>

      {/* Right: Pick 3 tasks + first 5 available */}
      <div>
        <h3 className="text-body font-semibold text-bonsai-brown-700 mb-2">
          Pick up to 3 tasks for Today&apos;s Lineup
        </h3>
        <p className="text-secondary text-bonsai-slate-600 mb-4">
          Choose what you want to focus on today. These will appear in Today&apos;s Lineup in Tasks.
        </p>
        {availableTasks.length === 0 ? (
          <p className="text-secondary text-bonsai-slate-600 mb-4">
            No available tasks right now. Add tasks in the Tasks section or clear blockers.
          </p>
        ) : (
          <div className="space-y-2 mb-6">
            {availableTasks.slice(0, 5).map((task) => {
              const inLineUp = lineUpTaskIds.has(task.id)
              return (
                <div
                  key={task.id}
                  className="flex flex-col gap-2 rounded-lg border border-bonsai-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  {/* Task row: tap/click opens AddEditTaskModal (same as overdue step) */}
                  <div className="flex-1 min-w-0">
                    <CompactTaskItem
                      task={task}
                      onClick={() => onEditTask(task)}
                      isBlocked={false}
                      isBlocking={false}
                    />
                  </div>
                  <div className="sm:ml-3">
                    <Button
                      type="button"
                      variant={inLineUp ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() =>
                        inLineUp ? onRemoveFromLineUp(task.id) : onAddToLineUp(task.id)
                      }
                    >
                      {inLineUp ? 'Remove from lineup' : 'Add to lineup'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <BriefingFooter onBack={onBack} onNext={onNext} />
      </div>
    </div>
  )
}

