/* useDashboardTaskEnrichment: Subtask and checklist counts for home dashboard task rows */

import { useEffect, useState } from 'react'
import { getTaskChecklists, getTaskChecklistItems } from '../../../lib/supabase/tasks'
import type { Task } from '../../tasks/types'

export interface DashboardTaskEnrichment {
  /** Completed/total subtasks e.g. "2/5" */
  subtaskSummary?: string
  /** Completed/total checklist items when the task has checklists */
  checklistSummary?: { completed: number; total: number }
}

/**
 * Loads subtask and checklist progress for a small set of tasks (home widget).
 * Matches TaskList enrichment logic for consistent counts.
 */
export function useDashboardTaskEnrichment(
  taskIds: string[],
  fetchSubtasks: (taskId: string) => Promise<Task[]>,
): Record<string, DashboardTaskEnrichment> {
  const [enrichment, setEnrichment] = useState<Record<string, DashboardTaskEnrichment>>({})

  const taskIdsKey = taskIds.join(',')

  useEffect(() => {
    if (taskIds.length === 0) {
      setEnrichment({})
      return
    }

    let cancelled = false

    ;(async () => {
      const next: Record<string, DashboardTaskEnrichment> = {}

      await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            const [checklists, subtasks] = await Promise.all([
              getTaskChecklists(taskId).catch(() => []),
              fetchSubtasks(taskId).catch(() => []),
            ])

            /* Subtasks: completed/total (same formula as TaskListItem) */
            const subtaskCount = subtasks.length
            let subtaskSummary: string | undefined
            if (subtaskCount > 0) {
              const completed = subtasks.filter((s) => s.status === 'completed').length
              subtaskSummary = `${completed}/${subtaskCount}`
            }

            /* Checklists: sum items across all checklists on the task */
            let completedItems = 0
            let totalItems = 0
            for (const checklist of checklists) {
              const items = await getTaskChecklistItems(checklist.id).catch(() => [])
              totalItems += items.length
              completedItems += items.filter((i) => i.completed).length
            }

            next[taskId] = {
              subtaskSummary,
              checklistSummary:
                totalItems > 0 ? { completed: completedItems, total: totalItems } : undefined,
            }
          } catch (err) {
            console.error(`Error loading dashboard enrichment for task ${taskId}:`, err)
            next[taskId] = {}
          }
        }),
      )

      if (!cancelled) setEnrichment(next)
    })()

    return () => {
      cancelled = true
    }
  }, [taskIdsKey, fetchSubtasks])

  return enrichment
}
