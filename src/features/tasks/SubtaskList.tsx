/* SubtaskList component: Displays and manages subtasks (tasks with parent_id) */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { CompactTaskItem } from './CompactTaskItem'
import { AddEditSubtaskModal } from './AddEditSubtaskModal'
import { getTaskChecklists, getTaskChecklistItems, getTaskDependencies as fetchTaskDependencies } from '../../lib/supabase/tasks'
import type { Task } from './types'

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
  /** Remove a task dependency by id */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** When true, focus the "Add a subtask" input (e.g. after expanding from task row) */
  focusAddInput?: boolean
  /** Called after focus has been applied so parent can clear focusAddInput */
  onFocusAddInputConsumed?: () => void
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
  onDeleteTask: _onDeleteTask,
  onToggleComplete: _onToggleComplete,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  focusAddInput = false,
  onFocusAddInputConsumed,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<Task | null>(null)
  /* Ref for "Add a subtask" input so parent can request focus when expanding */
  const addInputRef = useRef<HTMLInputElement>(null)
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

  /* Fetch enrichment for subtasks: checklists, dependencies (reusable for dependency popover refresh) */
  const loadEnrichment = useCallback(async () => {
    if (subtasks.length === 0) {
      setSubtaskEnrichment({})
      return
    }
    const enrichment: typeof subtaskEnrichment = {}
    await Promise.all(
      subtasks.map(async (subtask) => {
        try {
          const [checklists, deps] = await Promise.all([
            getTaskChecklists(subtask.id).catch((err) => {
              console.error(`Error fetching checklists for subtask ${subtask.id}:`, err)
              return []
            }),
            fetchTaskDependencies(subtask.id).catch((err) => {
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
  }, [subtasks, getTaskDependencies])

  /* Run enrichment load when subtasks change */
  useEffect(() => {
    loadEnrichment()
  }, [loadEnrichment])

  /* Focus add-subtask input when parent requests it; wait until loading is done so the input is in the DOM */
  useEffect(() => {
    if (!focusAddInput || loading) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        addInputRef.current?.focus()
        onFocusAddInputConsumed?.()
      })
    })
    return () => cancelAnimationFrame(id)
  }, [focusAddInput, loading, onFocusAddInputConsumed])

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

  if (loading) {
    return <div className="text-sm text-bonsai-slate-500">Loading subtasks...</div>
  }

  return (
    <div className="space-y-4">
      {/* Subtasks list: displayed as CompactTaskItem components (used in modals) */}
      {subtasks.length === 0 ? (
        <p className="text-sm text-bonsai-slate-500 italic">No subtasks yet</p>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => {
            const enrichment = subtaskEnrichment[subtask.id] ?? {
              isBlocked: false,
              isBlocking: false,
              blockingCount: 0,
              blockedByCount: 0,
            }
            return (
              <CompactTaskItem
                key={subtask.id}
                task={subtask}
                onClick={() => openEditModal(subtask)}
                isBlocked={enrichment.isBlocked}
                isBlocking={enrichment.isBlocking}
              />
            )
          })}
        </div>
      )}
      {/* Add subtask input: shown under the last subtask */}
      <div className="flex gap-2">
        <Input
          ref={addInputRef}
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
          onRemoveDependency={onRemoveDependency}
          onDependenciesChanged={loadEnrichment}
        />
      )}
    </div>
  )
}
