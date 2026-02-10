/* SubtaskList component: Displays and manages subtasks for a parent task */
import { useState, useEffect } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import type { Subtask } from './types'

interface SubtaskListProps {
  /** Parent task ID */
  taskId: string
  /** Function to fetch subtasks */
  fetchSubtasks: (taskId: string) => Promise<Subtask[]>
  /** Function to create a subtask */
  onCreateSubtask: (taskId: string, title: string) => Promise<Subtask>
  /** Function to update a subtask */
  onUpdateSubtask: (
    id: string,
    updates: Partial<Pick<Subtask, 'title' | 'completed'>>,
  ) => Promise<Subtask>
  /** Function to delete a subtask */
  onDeleteSubtask: (id: string) => Promise<void>
  /** Function to toggle subtask completion */
  onToggleComplete: (id: string, completed: boolean) => Promise<Subtask>
}

/**
 * Component for displaying and managing subtasks
 * Supports creating, updating, deleting, and toggling completion of subtasks
 */
export function SubtaskList({
  taskId,
  fetchSubtasks,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onToggleComplete,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Load subtasks when component mounts or taskId changes
  useEffect(() => {
    loadSubtasks()
  }, [taskId])

  // Load subtasks from database
  const loadSubtasks = async () => {
    try {
      setLoading(true)
      const data = await fetchSubtasks(taskId)
      setSubtasks(data)
    } catch (error) {
      console.error('Error loading subtasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new subtask
  const handleCreate = async () => {
    if (!newSubtaskTitle.trim()) return

    try {
      const newSubtask = await onCreateSubtask(taskId, newSubtaskTitle.trim())
      setSubtasks((prev) => [...prev, newSubtask])
      setNewSubtaskTitle('')
    } catch (error) {
      console.error('Error creating subtask:', error)
    }
  }

  // Start editing a subtask
  const startEdit = (subtask: Subtask) => {
    setEditingId(subtask.id)
    setEditTitle(subtask.title)
  }

  // Save edited subtask
  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      const updated = await onUpdateSubtask(id, { title: editTitle.trim() })
      setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setEditingId(null)
      setEditTitle('')
    } catch (error) {
      console.error('Error updating subtask:', error)
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  // Delete a subtask
  const handleDelete = async (id: string) => {
    try {
      await onDeleteSubtask(id)
      setSubtasks((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      console.error('Error deleting subtask:', error)
    }
  }

  // Toggle subtask completion
  const handleToggle = async (id: string, completed: boolean) => {
    try {
      const updated = await onToggleComplete(id, completed)
      setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (error) {
      console.error('Error toggling subtask:', error)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading subtasks...</div>
  }

  return (
    <div className="space-y-2">
      {/* Create new subtask input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCreate()
            }
          }}
          className="flex-1"
        />
        <Button onClick={handleCreate} size="sm">
          Add
        </Button>
      </div>

      {/* Subtasks list */}
      {subtasks.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No subtasks yet</p>
      ) : (
        <ul className="space-y-2">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
            >
              <Checkbox
                checked={subtask.completed}
                onChange={(e) => handleToggle(subtask.id, e.target.checked)}
              />
              {editingId === subtask.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(subtask.id)
                      } else if (e.key === 'Escape') {
                        cancelEdit()
                      }
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
                    className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : ''}`}
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
