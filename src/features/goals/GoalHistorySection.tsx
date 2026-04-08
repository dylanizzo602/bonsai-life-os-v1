/* GoalHistorySection component: Timeline view of goal history */
import type { GoalHistory, GoalHistoryEventType } from './types'

interface GoalHistorySectionProps {
  /** History entries to display */
  history: GoalHistory[]
  /** Loading state */
  loading?: boolean
}

/* Map stored event_type to a short label for the timeline */
function eventTypeLabel(eventType: GoalHistoryEventType): string {
  switch (eventType) {
    case 'progress_change':
      return 'Goal progress'
    case 'milestone_completed':
      return 'Milestone completed'
    case 'milestone_created':
      return 'Milestone added'
    case 'milestone_updated':
      return 'Milestone update'
    case 'habit_linked':
      return 'Habit linked'
    case 'habit_unlinked':
      return 'Habit unlinked'
    default:
      return eventType
  }
}

/**
 * Goal history section component.
 * Displays timeline of goal events (progress changes, milestone completions, etc.).
 */
export function GoalHistorySection({ history, loading = false }: GoalHistorySectionProps) {
  /* Format full timestamp for each row (milestone updates are ordered to the second) */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  /* Group history by calendar day */
  const groupedByDate = history.reduce((acc, entry) => {
    const date = entry.created_at.slice(0, 10)
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {} as Record<string, GoalHistory[]>)

  /* Newest calendar days first; within a day, newest events first */
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  if (loading) {
    return (
      <div>
        <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Goal History</h2>
        <p className="text-secondary text-bonsai-slate-500 py-4">Loading history…</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Goal History</h2>

      {history.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500 py-4">
          No history yet. History will appear here as you make progress.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-secondary font-medium text-bonsai-slate-700 mb-2">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <div className="space-y-2 ml-4 border-l-2 border-bonsai-slate-200 pl-4">
                {[...groupedByDate[date]]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((entry) => (
                  <div key={entry.id} className="py-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-bonsai-sage-600 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-secondary text-bonsai-slate-500 text-xs mb-1">
                          {eventTypeLabel(entry.event_type)}
                        </p>
                        <p className="text-body text-bonsai-slate-800 break-words">
                          {entry.description || entry.event_type}
                        </p>
                        <p className="text-secondary text-bonsai-slate-500 text-xs mt-1">
                          {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
