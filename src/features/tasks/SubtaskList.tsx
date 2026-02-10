/* SubtaskList component: Displays and manages subtasks (tasks with parent_id) */
import { useState, useEffect } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import type { Task } from './types'

interface SubtaskListProps {
  /** Parent task ID */
  taskId: string
  /** Fetch subtasks (tasks where parent_id = taskId) */
  fetchSubtasks: (taskId: string) => Promise<Task[]>
  /** Create subtask */
  onCreateSubtask: (taskId: string, title: string) => Promise<Task>
  /** Update task (for subtask title edits) */
  onUpdateTask: (id: string, updates: { title?: string }) => Promise<Task>
  /** Delete task (for subtasks) */
  onDeleteTask: (id: string) => Promise<void>
  /** Toggle subtask completion (status: completed | active) */
  onToggleComplete: (id: string, completed: boolean) => Promise<Task>
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
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

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

  const handleCreate = async () => {
    if (!newSubtaskTitle.trim()) return
    try {
      const newSubtask = await onCreateSubtask(taskId, newSubtaskTitle.trim())
      setSubtasks((prev) => [...prev, newSubtask])
      setNewSubtaskTitle('')
    } catch (err) {
      console.error('Error creating subtask:', err)
    }
  }

  const startEdit = (subtask: Task) => {
    setEditingId(subtask.id)
    setEditTitle(subtask.title)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      const updated = await onUpdateTask(id, { title: editTitle.trim() })
      setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setEditingId(null)
      setEditTitle('')
    } catch (err) {
      console.error('Error updating subtask:', err)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const handleDelete = async (id: string) => {
    try {
      await onDeleteTask(id)
      setSubtasks((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Error deleting subtask:', err)
    }
  }

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      const updated = await onToggleComplete(id, completed)
      setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (err) {
      console.error('Error toggling subtask:', err)
    }
  }

  if (loading) {
    return <div className="text-sm text-bonsai-slate-500">Loading subtasks...</div>
  }

  return (
    <div className="space-y-2">
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
        <Button onClick={handleCreate} size="sm">
          Add
        </Button>
      </div>
      {subtasks.length === 0 ? (
        <p className="text-sm text-bonsai-slate-500 italic">No subtasks yet</p>
      ) : (
        <ul className="space-y-2">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-bonsai-slate-50"
            >
              <Checkbox
                checked={subtask.status === 'completed'}
                onChange={(e) => handleToggle(subtask.id, e.target.checked)}
              />
              {editingId === subtask.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(subtask.id)
                      else if (e.key === 'Escape') cancelEdit()
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button onClick={() => handleSaveEdit(subtask.id)} size="sm" variant="primary">
                    Save
                  </Button>
                  <Button onClick={cancelEdit} size="sm" variant="ghost">
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={`flex-1 ${
                      subtask.status === 'completed' ? 'line-through text-bonsai-slate-500' : ''
                    }`}
                    onDoubleClick={() => startEdit(subtask)}
                  >
                    {subtask.title}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => startEdit(subtask)}
                      size="sm"
                      variant="ghost"
                      title="Edit"
                    >
                      ✏️
                    </Button>
                    <Button
                      onClick={() => handleDelete(subtask.id)}
                      size="sm"
                      variant="danger"
                      title="Delete"
                    >
                      🗑️
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
