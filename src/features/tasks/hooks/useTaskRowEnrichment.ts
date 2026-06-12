/* useTaskRowEnrichment: Load checklist, subtask, and dependency summaries for task rows */

import { useEffect, useState } from 'react'
import type { Task } from '../types'
import { getChecklistSummaryForTask } from '../../../lib/supabase/tasks'
import {
  EMPTY_TASK_ENRICHMENT,
  type TaskRowEnrichment,
} from '../types/taskRowEnrichment'
import { getDependencyEnrichmentFlags } from '../utils/dependencies'

interface UseTaskRowEnrichmentOptions {
  tasks: Task[]
  /** Full task list for blocker/blocked status lookup (may include tasks outside `tasks`). */
  allTasks?: Task[]
  fetchSubtasks?: (taskId: string) => Promise<Task[]>
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('../types').TaskDependency[]
    blockedBy: import('../types').TaskDependency[]
  }>
  /** Bump after task/checklist edits so row metadata refetches (e.g. modal close). */
  refreshKey?: number
}

/**
 * Fetches enrichment for visible tasks (parents: full summary; subtasks: dependencies only).
 */
export function useTaskRowEnrichment({
  tasks,
  allTasks,
  fetchSubtasks,
  getTaskDependencies,
  refreshKey = 0,
}: UseTaskRowEnrichmentOptions) {
  const [enrichmentById, setEnrichmentById] = useState<Record<string, TaskRowEnrichment>>({})
  const [loading, setLoading] = useState(false)

  const taskLookupKey = (allTasks ?? tasks)
    .map((t) => `${t.id}:${t.status}`)
    .sort()
    .join(',')

  const taskIdsKey = tasks
    .map((t) => t.id)
    .sort()
    .join(',')

  useEffect(() => {
    if (!fetchSubtasks || tasks.length === 0) {
      setEnrichmentById({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const load = async () => {
      const lookupSource = allTasks ?? tasks
      const taskLookup = new Map(lookupSource.map((t) => [t.id, t] as const))
      const enrichment: Record<string, TaskRowEnrichment> = {}
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const deps = await (
              getTaskDependencies?.(task.id) ?? Promise.resolve({ blocking: [], blockedBy: [] })
            ).catch(() => ({ blocking: [], blockedBy: [] }))
            const depFlags = getDependencyEnrichmentFlags(
              deps.blockedBy,
              deps.blocking,
              taskLookup,
            )

            if (task.parent_id) {
              enrichment[task.id] = {
                ...EMPTY_TASK_ENRICHMENT,
                ...depFlags,
              }
              return
            }

            const [checklistSummary, subtasksResult] = await Promise.all([
              getChecklistSummaryForTask(task.id).catch(() => ({ completed: 0, total: 0 })),
              fetchSubtasks(task.id).catch(() => []),
            ])
            const subtasks = Array.isArray(subtasksResult) ? subtasksResult : []
            const subtaskCount = subtasks.length
            const incompleteSubtaskCount = subtasks.filter((s) => s.status !== 'completed').length
            const subtaskTimeTotal = subtasks.reduce((sum, st) => sum + (st.time_estimate ?? 0), 0)
            enrichment[task.id] = {
              checklistSummary:
                checklistSummary.total > 0 ? checklistSummary : undefined,
              hasSubtasks: subtaskCount > 0,
              subtaskCount,
              incompleteSubtaskCount,
              subtaskTimeTotal,
              ...depFlags,
            }
          } catch {
            enrichment[task.id] = { ...EMPTY_TASK_ENRICHMENT }
          }
        }),
      )
      if (!cancelled) {
        setEnrichmentById(enrichment)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [taskIdsKey, taskLookupKey, tasks, allTasks, fetchSubtasks, getTaskDependencies, refreshKey])

  const getEnrichment = (taskId: string): TaskRowEnrichment =>
    enrichmentById[taskId] ?? EMPTY_TASK_ENRICHMENT

  return { enrichmentById, getEnrichment, loading }
}
