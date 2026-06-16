/* completeTaskAndResolveAll: Mark all subtasks and checklist items complete, then complete the task */

import {
  getTaskChecklistItems,
  getTaskChecklists,
  toggleChecklistItemComplete,
} from '../../../lib/supabase/tasks'
import type { Task } from '../types'

/**
 * Complete a task after marking every subtask and checklist item as done.
 * Used by the unresolved-items confirmation modal across task views.
 */
export async function completeTaskAndResolveAll(options: {
  taskId: string
  fetchSubtasks: (taskId: string) => Promise<Task[]>
  toggleComplete: (id: string, completed: boolean) => Promise<Task>
}): Promise<void> {
  const { taskId, fetchSubtasks, toggleComplete } = options

  const subtasks = await fetchSubtasks(taskId)
  for (const subtask of subtasks) {
    if (subtask.status !== 'completed') {
      await toggleComplete(subtask.id, true)
    }
  }

  const checklists = await getTaskChecklists(taskId)
  for (const checklist of checklists) {
    const items = await getTaskChecklistItems(checklist.id)
    for (const item of items) {
      if (!item.completed) {
        await toggleChecklistItemComplete(item.id, true)
      }
    }
  }

  await toggleComplete(taskId, true)
}
