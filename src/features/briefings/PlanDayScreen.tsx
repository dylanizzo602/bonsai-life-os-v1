/* PlanDayScreen: Placeholder calendar left; right = Pick 3 for Today's Lineup + first 5 available tasks */

import { Button } from '../../components/Button'
import type { Task } from '../tasks/types'

interface PlanDayScreenProps {
  /** First 5 tasks from "available" view (not completed, not blocked, start <= now) */
  availableTasks: Task[]
  /** Task IDs currently in Today's Lineup */
  lineUpTaskIds: Set<string>
  /** Add task to Today's Lineup */
  onAddToLineUp: (taskId: string) => void
  /** Remove task from Today's Lineup */
  onRemoveFromLineUp: (taskId: string) => void
  /** Go to next step */
  onNext: () => void
}

/**
 * Plan your day step: left = placeholder calendar; right = prompt to pick 3 tasks + first 5 available.
 * Uses same Today's Lineup storage as Tasks section (date-scoped, resets daily).
 */
export function PlanDayScreen({
  availableTasks,
  lineUpTaskIds,
  onAddToLineUp,
  onRemoveFromLineUp,
  onNext,
}: PlanDayScreenProps) {
  /* Placeholder: replace with real calendar later */
  const placeholderEvents = [
    { time: '9:00 AM', title: 'Team standup' },
    { time: '2:00 PM', title: 'Project review' },
  ]

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-8">
      {/* Left: Today's calendar placeholder */}
      <div>
        <h3 className="text-body font-semibold text-bonsai-brown-700 mb-3">
          Today's calendar
        </h3>
        <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
          {placeholderEvents.length === 0 ? (
            <p className="text-secondary text-bonsai-slate-600">No events today</p>
          ) : (
            <ul className="space-y-2">
              {placeholderEvents.map((ev, i) => (
                <li key={i} className="text-body text-bonsai-slate-700">
                  <span className="font-medium">{ev.time}</span> — {ev.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Pick 3 tasks + first 5 available */}
      <div>
        <h3 className="text-body font-semibold text-bonsai-brown-700 mb-2">
          Pick up to 3 tasks for Today's Lineup
        </h3>
        <p className="text-secondary text-bonsai-slate-600 mb-4">
          Choose what you want to focus on today. These will appear in Today's Lineup in Tasks.
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
                  className="flex items-center justify-between gap-3 rounded-lg border border-bonsai-slate-200 p-3"
                >
                  <span className="text-body text-bonsai-slate-800 min-w-0 truncate flex-1">
                    {task.title}
                  </span>
                  <Button
                    type="button"
                    variant={inLineUp ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => (inLineUp ? onRemoveFromLineUp(task.id) : onAddToLineUp(task.id))}
                  >
                    {inLineUp ? 'Remove from lineup' : 'Add to lineup'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <Button type="button" onClick={onNext} variant="primary" className="w-full">
          Next
        </Button>
      </div>
    </div>
  )
}
