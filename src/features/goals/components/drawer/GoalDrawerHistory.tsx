/* GoalDrawerHistory: material timeline of goal history events */
import { MaterialIcon } from '../../../../components/MaterialIcon'
import type { GoalHistory, GoalHistoryEventType } from '../../types'
import { formatGoalHistoryTime } from '../../utils/formatGoalDate'

interface GoalDrawerHistoryProps {
  history: GoalHistory[]
  loading?: boolean
}

function historyIcon(eventType: GoalHistoryEventType): string {
  switch (eventType) {
    case 'milestone_completed':
      return 'assignment_turned_in'
    case 'progress_change':
      return 'trending_up'
    case 'milestone_created':
      return 'flag'
    case 'habit_linked':
    case 'habit_unlinked':
      return 'cached'
    default:
      return 'history'
  }
}

/**
 * Goal history list with icons and relative timestamps.
 */
export function GoalDrawerHistory({ history, loading = false }: GoalDrawerHistoryProps) {
  if (loading) {
    return (
      <section className="flex flex-col gap-4 border-t border-surface-container-high pt-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          Goal History
        </h3>
        <p className="text-secondary text-on-surface-variant">Loading history…</p>
      </section>
    )
  }

  const sorted = [...history].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <section className="flex flex-col gap-4 border-t border-surface-container-high pt-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
        Goal History
      </h3>

      {sorted.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">
          No history yet. Events appear as you make progress.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {sorted.map((entry) => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
                <MaterialIcon
                  name={historyIcon(entry.event_type)}
                  className={`text-[16px] ${
                    entry.event_type === 'milestone_completed' ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-on-surface">
                  {entry.description || entry.event_type}
                </p>
                <span className="text-xs text-on-surface-variant">
                  {formatGoalHistoryTime(entry.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
