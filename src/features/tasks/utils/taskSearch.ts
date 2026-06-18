/* taskSearch: Client-side task name search for Bonsai search results view */

import type { TaskOption } from '../../../components/TaskSearchSelect'
import type { Task } from '../types'

/** Map tasks to the shared TaskSearchSelect option shape */
export function mapTasksToSearchOptions(tasks: Task[]): TaskOption[] {
  return tasks.map((t) => ({ id: t.id, title: t.title }))
}

/** Top-level tasks only (candidates for parent task or link-as-subtask source) */
export function getTopLevelTaskSearchOptions(tasks: Task[]): TaskOption[] {
  return mapTasksToSearchOptions(tasks.filter((t) => t.parent_id === null))
}

/** True when task title contains the query (case-insensitive). */
export function matchesTaskNameSearch(task: Task, searchQuery: string): boolean {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return true
  return (task.title ?? '').toLowerCase().includes(q)
}

/**
 * Tasks eligible for Bonsai search/filter lists (excludes archive, trash, habits, orphaned subtasks).
 */
export function getBonsaiSearchableTaskPool(tasks: Task[]): Task[] {
  const taskById = new Map(tasks.map((t) => [t.id, t] as const))
  return tasks.filter((t) => {
    if (t.status === 'deleted' || t.status === 'archived') return false
    if (t.habit_id) return false
    if (t.parent_id) {
      const parent = taskById.get(t.parent_id)
      if (parent?.status === 'deleted' || parent?.status === 'archived') return false
    }
    return true
  })
}
