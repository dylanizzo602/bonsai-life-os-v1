/* SubtaskList component: Displays and manages subtasks (tasks with parent_id) */
import { useState, useEffect } from 'react'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { FullSubtaskItem } from './FullSubtaskItem'
import { AddEditSubtaskModal } from './AddEditSubtaskModal'
import { getTaskChecklists, getTaskChecklistItems, getTaskDependencies } from '../../lib/supabase/tasks'
import type { Task, CreateTaskInput } from './types'

interface SubtaskListProps {
  /** Parent task ID */
  taskId: string
  /** Fetch subtasks (tasks where parent_id = taskId) */
  fetchSubtasks: (taskId: string) => Promise<Task[]>
  /** Create subtask */
  onCreateSubtask: (taskId: string, title: string) => Promise<Task>
  /** Update task (for subtask edits) */
  onUpdateTask: (id: string, updates: import('./types').UpdateTaskInput) => Promise<Task>
  /** Delete task (for subtasks) */
  onDeleteTask: (id: string) => Promise<void>
  /** Toggle subtask completion (status: completed | active) */
  onToggleComplete: (id: string, completed: boolean) => Promise<Task>
  /** Fetch all tasks (for dependency modal) */
  getTasks?: () => Promise<Task[]>
  /** Fetch task dependencies */
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('./types').TaskDependency[]
    blockedBy: import('./types').TaskDependency[]
  }>
  /** Create a task dependency */
  onAddDependency?: (input: import('./types').CreateTaskDependencyInput) => Promise<void>
}

/**
 * List of subtasks for a parent task.
 * Subtasks are tasks with parent_id set; uses task APIs for CRUD.
 */
export function SubtaskList({
  taskId,
  fetchSubtasks,
  onCreateSubtask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  getTasks,
  getTaskDependencies,
  onAddDependency,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<Task | null>(null)
  const [subtaskEnrichment, setSubtaskEnrichment] = useState<Record<string, {
    checklistSummary?: { completed: number; total: number }
    isBlocked: boolean
    isBlocking: boolean
    blockingCount: number
    blockedByCount: number
  }>>({})

  /* Load subtasks when taskId changes */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchSubtasks(taskId)
        setSubtasks(data)
      } catch (err) {
        console.error('Error loading subtasks:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [taskId, fetchSubtasks])

  /* Fetch enrichment data for all subtasks: checklists, dependencies */
  useEffect(() => {
    const loadEnrichment = async () => {
      const enrichment: typeof subtaskEnrichment = {}
      await Promise.all(
        subtasks.map(async (subtask) => {
          try {
            const [checklists, deps] = await Promise.all([
              getTaskChecklists(subtask.id).catch((err) => {
                console.error(`Error fetching checklists for subtask ${subtask.id}:`, err)
                return []
              }),
              getTaskDependencies(subtask.id).catch((err) => {
                console.error(`Error fetching dependencies for subtask ${subtask.id}:`, err)
                return { blocking: [], blockedBy: [] }
              }),
            ])
            let completed = 0
            let total = 0
            for (const c of checklists) {
              const items = await getTaskChecklistItems(c.id).catch(() => [])
              total += items.length
              completed += items.filter((i) => i.completed).length
            }
            enrichment[subtask.id] = {
              checklistSummary: total > 0 ? { completed, total } : undefined,
              isBlocked: deps.blockedBy.length > 0,
              isBlocking: deps.blocking.length > 0,
              blockingCount: deps.blocking.length,
              blockedByCount: deps.blockedBy.length,
            }
          } catch (err) {
            console.error(`Error loading enrichment for subtask ${subtask.id}:`, err)
            enrichment[subtask.id] = {
              isBlocked: false,
              isBlocking: false,
              blockingCount: 0,
              blockedByCount: 0,
            }
          }
        }),
      )
      setSubtaskEnrichment(enrichment)
    }
    if (subtasks.length > 0) {
      loadEnrichment()
    } else {
      setSubtaskEnrichment({})
    }
  }, [subtasks])

  /* Create subtask: opens modal for full editing */
  const handleCreate = async () => {
    if (!newSubtaskTitle.trim()) return
    try {
      const newSubtask = await onCreateSubtask(taskId, newSubtaskTitle.trim())
      setSubtasks((prev) => [...prev, newSubtask])
      setNewSubtaskTitle('')
      /* Open edit modal for the newly created subtask */
      setEditingSubtask(newSubtask)
      setEditModalOpen(true)
    } catch (err) {
      console.error('Error creating subtask:', err)
    }
  }

  /* Open edit modal for a subtask */
  const openEditModal = (subtask: Task) => {
    setEditingSubtask(subtask)
    setEditModalOpen(true)
  }

  /* Close edit modal */
  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingSubtask(null)
  }

  /* Handle subtask update from modal */
  const handleSubtaskUpdated = async () => {
    if (editingSubtask) {
      /* Reload subtasks to get updated data */
      try {
        const updated = await fetchSubtasks(taskId)
        setSubtasks(updated)
      } catch (err) {
        console.error('Error reloading subtasks:', err)
      }
    }
  }

  /* Handle subtask deletion */
  const handleDelete = async (id: string) => {
    try {
      await onDeleteTask(id)
      setSubtasks((prev) => prev.filter((s) => s.id !== id))
      /* Reload enrichment after deletion */
      const updated = await fetchSubtasks(taskId)
      setSubtasks(updated)
    } catch (err) {
      console.error('Error deleting subtask:', err)
    }
  }

  if (loading) {
    return <div className="text-sm text-bonsai-slate-500">Loading subtasks...</div>
  }

  return (
    <div className="space-y-4">
      {/* Subtasks list: displayed as FullTaskItem components */}
      {subtasks.length === 0 ? (
        <p className="text-sm text-bonsai-slate-500 italic">No subtasks yet</p>
      ) : (
        <div className="space-y-4">
          {subtasks.map((subtask) => {
            const enrichment = subtaskEnrichment[subtask.id] ?? {
              isBlocked: false,
              isBlocking: false,
              blockingCount: 0,
              blockedByCount: 0,
            }
            return (
              <FullSubtaskItem
                key={subtask.id}
                subtask={subtask}
                onClick={() => openEditModal(subtask)}
                checklistSummary={enrichment.checklistSummary}
                isBlocked={enrichment.isBlocked}
                isBlocking={enrichment.isBlocking}
                blockingCount={enrichment.blockingCount}
                blockedByCount={enrichment.blockedByCount}
                onUpdateStatus={async (taskId, status) => {
                  try {
                    await onUpdateTask(taskId, { status })
                  } catch (error) {
                    console.error('Failed to update subtask status:', error)
                    throw error // Re-throw so FullTaskItem can handle it
                  }
                }}
                onUpdateTask={async (taskId, input) => {
                  try {
                    await onUpdateTask(taskId, input)
                  } catch (error) {
                    console.error('Failed to update subtask:', error)
                    throw error // Re-throw so FullSubtaskItem can handle it
                  }
                }}
              />
            )
          })}
        </div>
      )}
      {/* Add subtask input: shown under the last subtask */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
          }}
          className="flex-1"
        />
        <Button onClick={handleCreate} size="sm" variant="primary">
          Add
        </Button>
      </div>

      {/* Edit subtask modal */}
      {editingSubtask && (
        <AddEditSubtaskModal
          isOpen={editModalOpen}
          onClose={closeEditModal}
          subtask={editingSubtask}
          onUpdateTask={async (id, input) => {
            const updated = await onUpdateTask(id, input)
            await handleSubtaskUpdated()
            return updated
          }}
          getTasks={getTasks}
          getTaskDependencies={getTaskDependencies}
          onAddDependency={onAddDependency}
        />
      )}
    </div>
  )
}
