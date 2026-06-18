/* Greeting step helpers: calendar first meeting, priority task counts */

import type { Task } from '../../tasks/types'
import type { CalendarAgendaEvent } from '../types'
import { isPriorityMediumOrAbove } from '../../tasks/utils/available'

/** Sort timed events and return the first non-all-day event today */
export function getFirstTimedEventToday(events: CalendarAgendaEvent[]): CalendarAgendaEvent | null {
  const timed = events
    .filter((e) => !e.isAllDay)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  return timed[0] ?? null
}

/** Subtitle copy for the greeting calendar widget */
export function formatFirstMeetingSubtitle(event: CalendarAgendaEvent | null, allEvents: CalendarAgendaEvent[]): string {
  if (event) {
    const time = event.start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `Your first meeting is at ${time}`
  }
  if (allEvents.some((e) => e.isAllDay)) {
    return 'All-day events on your calendar'
  }
  if (allEvents.length > 0) {
    return 'Check your agenda for today'
  }
  return 'Nothing scheduled yet'
}

/** Count open tasks due today with medium+ priority */
export function getPriorityTasksDueTodayCount(
  tasks: Task[],
  todayStart: number,
  todayEnd: number,
): number {
  return tasks.filter(
    (t) =>
      t.due_date &&
      !['completed', 'archived', 'deleted'].includes(t.status) &&
      new Date(t.due_date).getTime() >= todayStart &&
      new Date(t.due_date).getTime() <= todayEnd &&
      isPriorityMediumOrAbove(t.priority),
  ).length
}
