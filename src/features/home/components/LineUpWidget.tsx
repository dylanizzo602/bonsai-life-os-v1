/* LineUpWidget: Today's lineup tasks in compact view with add/remove and task search modal to add existing tasks */

import { useState, useEffect, useCallback } from 'react'
import { CompactTaskItem } from '../../tasks/CompactTaskItem'
import { DashboardWidget } from './DashboardWidget'
import { useTasks } from '../../tasks/hooks/useTasks'
import { getTodaysLineupOrderedIds, saveTodaysLineupTaskIds } from '../../../lib/todaysLineup'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import type { Task } from '../../tasks/types'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { TaskSearchSelect } from '../../../components/TaskSearchSelect'

export interface LineUpWidgetProps {
  /** When provided, use these tasks (e.g. from parent useTasks) so edits from lineup update the same source and widget re-renders */
  tasks?: Task[]
  onOpenEditTask?: (task: Task) => void
}

/**
 * Line Up widget: tasks in today's lineup in compact view; remove from lineup; add to lineup via task search modal.
 * When tasks prop is provided, uses it so edits from this widget update the same list (fixes lineup not updating after edit).
 */
export function LineUpWidget({ tasks: tasksProp, onOpenEditTask }: LineUpWidgetProps) {
  /* Tasks source: prefer tasks passed from parent, fall back to tasks from useTasks hook */
  const { tasks: tasksFromHook, getTasks } = useTasks()
  const tasks = tasksProp ?? tasksFromHook
  /* Local state: ordered lineup task IDs for today */
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  /* Modal state: controls visibility of "add to lineup" task search modal */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  /* Load lineup from localStorage on mount */
  useEffect(() => {
    setOrderedIds(getTodaysLineupOrderedIds())
  }, [])

  /* Tasks in lineup order (preserve order; only include tasks that still exist) */
  const lineupTasks = orderedIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => t != null)

  /* Remove task from today's lineup and persist updated IDs */
  const removeFromLineUp = useCallback((taskId: string) => {
    setOrderedIds((prev) => {
      const next = prev.filter((id) => id !== taskId)
      saveTodaysLineupTaskIds(new Set(next))
      return next
    })
  }, [])

  /* Add task to today's lineup (avoid duplicates) and persist updated IDs */
  const addToLineUp = useCallback((taskId: string) => {
    setOrderedIds((prev) => {
      if (prev.includes(taskId)) return prev
      const next = [...prev, taskId]
      saveTodaysLineupTaskIds(new Set(next))
      return next
    })
  }, [])

  /* Format due date for compact task display */
  const formatDue = useCallback((iso: string | null | undefined) => {
    return formatStartDueDisplay(iso, null)
  }, [])

  /* Map full Task[] to TaskSearchSelect options for modal search */
  const getTasksForSearch = useCallback(async () => {
    const allTasks = await getTasks()
    return allTasks.map((t) => ({ id: t.id, title: t.title }))
  }, [getTasks])

  /* Handle selection from task search modal: add selected task to lineup and close modal */
  const handleSelectTaskForLineup = useCallback(
    async (task: { id: string; title: string }) => {
      addToLineUp(task.id)
      setIsAddModalOpen(false)
    },
    [addToLineUp],
  )

  return (
    <>
      <DashboardWidget
        title="Line Up"
        fullWidth
        stretchBody={false}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add to lineup
          </Button>
        }
      >
        {lineupTasks.length === 0 ? (
          <div className="min-h-[64px] flex items-center">
            <p className="text-secondary text-bonsai-slate-500">
              No tasks in today&apos;s lineup. Add tasks from the Tasks section or use &quot;Add to lineup&quot; here.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {lineupTasks.map((task) => (
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
            ))}
          </div>
        )}
      </DashboardWidget>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add task to today's lineup"
      >
        <div className="space-y-4">
          <p className="text-secondary text-bonsai-slate-700">
            Search for an existing task to add it to today&apos;s lineup.
          </p>
          <TaskSearchSelect
            getTasks={getTasksForSearch}
            onSelectTask={handleSelectTaskForLineup}
            placeholder="Search tasks by name..."
            aria-label="Search tasks to add to lineup"
          />
        </div>
      </Modal>
    </>
  )
}
