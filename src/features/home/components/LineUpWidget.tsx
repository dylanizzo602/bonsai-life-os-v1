/* LineUpWidget: Today's lineup tasks in compact view with add/remove */

import { useState, useEffect, useCallback } from 'react'
import { CompactTaskItem } from '../../tasks/CompactTaskItem'
import { DashboardWidget } from './DashboardWidget'
import { useTasks } from '../../tasks/hooks/useTasks'
import { getTodaysLineupOrderedIds, saveTodaysLineupTaskIds } from '../../../lib/todaysLineup'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import type { Task } from '../../tasks/types'
import { Button } from '../../../components/Button'

export interface LineUpWidgetProps {
  onOpenEditTask?: (task: Task) => void
  onOpenAddToLineup?: () => void
}

/**
 * Line Up widget: tasks in today's lineup in compact view; remove from lineup; add to lineup (navigate or picker).
 */
export function LineUpWidget({ onOpenEditTask, onOpenAddToLineup }: LineUpWidgetProps) {
  const { tasks } = useTasks()
  const [orderedIds, setOrderedIds] = useState<string[]>([])

  /* Load lineup from localStorage on mount */
  useEffect(() => {
    setOrderedIds(getTodaysLineupOrderedIds())
  }, [])

  /* Tasks in lineup order (preserve order; only include tasks that still exist) */
  const lineupTasks = orderedIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => t != null)

  const removeFromLineUp = useCallback((taskId: string) => {
    setOrderedIds((prev) => {
      const next = prev.filter((id) => id !== taskId)
      saveTodaysLineupTaskIds(new Set(next))
      return next
    })
  }, [])

  const formatDue = useCallback((iso: string | null | undefined) => {
    return formatStartDueDisplay(iso, null)
  }, [])

  return (
    <DashboardWidget
      title="Line Up"
      fullWidth
      actions={
        onOpenAddToLineup ? (
          <Button type="button" variant="secondary" size="sm" onClick={onOpenAddToLineup}>
            Add to lineup
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-3">
        {lineupTasks.length === 0 ? (
          <p className="text-secondary text-bonsai-slate-500">
            No tasks in today&apos;s lineup. Add tasks from the Tasks section or use &quot;Add to lineup&quot; there.
          </p>
        ) : (
          lineupTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-2"
            >
              <CompactTaskItem
                task={task}
                formatDueDate={formatDue}
                onRemove={() => removeFromLineUp(task.id)}
                onClick={() => onOpenEditTask?.(task)}
              />
            </div>
          ))
        )}
      </div>
    </DashboardWidget>
  )
}
