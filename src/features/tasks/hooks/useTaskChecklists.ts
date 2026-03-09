/* useTaskChecklists: Fetch checklists with items and mutations for a task */

import { useState, useEffect, useCallback } from 'react'
import {
  getTaskChecklists,
  getTaskChecklistItems,
  createTaskChecklist,
  updateTaskChecklist,
  createChecklistItem,
  toggleChecklistItemComplete,
} from '../../../lib/supabase/tasks'
import type { TaskChecklist, TaskChecklistItem } from '../types'

export interface ChecklistWithItems extends TaskChecklist {
  items: TaskChecklistItem[]
}

export function useTaskChecklists(taskId: string | null) {
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([])
  const [loading, setLoading] = useState(false)

  const fetchChecklists = useCallback(async () => {
    if (!taskId) {
      setChecklists([])
      return
    }
    setLoading(true)
    try {
      const lists = await getTaskChecklists(taskId)
      const withItems: ChecklistWithItems[] = await Promise.all(
        lists.map(async (c) => {
          const items = await getTaskChecklistItems(c.id)
          return { ...c, items }
        }),
      )
      setChecklists(withItems)
    } catch (err) {
      console.error('Error fetching checklists:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchChecklists()
  }, [fetchChecklists])

  const addChecklist = useCallback(
    async (title: string) => {
      if (!taskId || !title.trim()) return
      await createTaskChecklist({ task_id: taskId, title: title.trim() })
      await fetchChecklists()
    },
    [taskId, fetchChecklists],
  )

  const addItem = useCallback(
    async (checklistId: string, title: string) => {
      if (!title.trim()) return
      await createChecklistItem({ checklist_id: checklistId, title: title.trim() })
      await fetchChecklists()
    },
    [fetchChecklists],
  )

  /**
   * Add an item: if no checklists exist, create one ("Checklist") and add the item; otherwise add to first checklist.
   */
  const addItemOrCreateChecklist = useCallback(
    async (itemTitle: string) => {
      if (!taskId || !itemTitle.trim()) return
      if (checklists.length === 0) {
        const newList = await createTaskChecklist({ task_id: taskId, title: 'Checklist' })
        await createChecklistItem({ checklist_id: newList.id, title: itemTitle.trim() })
      } else {
        await createChecklistItem({
          checklist_id: checklists[0].id,
          title: itemTitle.trim(),
        })
      }
      await fetchChecklists()
    },
    [taskId, checklists, fetchChecklists],
  )

  /** Rename a checklist by id */
  const updateChecklistTitle = useCallback(
    async (checklistId: string, title: string) => {
      if (!title.trim()) return
      await updateTaskChecklist(checklistId, { title: title.trim() })
      await fetchChecklists()
    },
    [fetchChecklists],
  )

  const toggleItem = useCallback(
    async (itemId: string, completed: boolean) => {
      await toggleChecklistItemComplete(itemId, completed)
      setChecklists((prev) =>
        prev.map((c) => ({
          ...c,
          items: c.items.map((i) =>
            i.id === itemId ? { ...i, completed } : i,
          ),
        })),
      )
    },
    [],
  )

  return {
    checklists,
    loading,
    refetch: fetchChecklists,
    addChecklist,
    addItem,
    addItemOrCreateChecklist,
    updateChecklistTitle,
    toggleItem,
  }
}
