/* taskSearch: Client-side task name search for Bonsai search results view */

import type { Task } from '../types'

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
