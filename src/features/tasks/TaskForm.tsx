/* TaskForm component: Form for creating and editing tasks */
import { useState, useEffect } from 'react'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import type { Task, CreateTaskInput, UpdateTaskInput, TaskPriority } from './types'

interface TaskFormProps {
  /** Existing task to edit (undefined for new task) */
  task?: Task
  /** Function called when form is submitted */
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>
  /** Function called when form is cancelled */
  onCancel: () => void
}

/**
 * Form component for creating or editing tasks
 * Handles all task fields including title, description, due date, priority, category
 */
export function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Initialize form with task data if editing
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setPriority(task.priority)
      setCategory(task.category ?? '')
    }
  }, [task])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      const formData: CreateTaskInput | UpdateTaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        category: category.trim() || null,
      }

      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting task:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        required
        autoFocus
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task description (optional)"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          options={priorityOptions}
        />
      </div>

      <Input
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (optional)"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" onClick={onCancel} variant="secondary" disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting || !title.trim()}>
          {submitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}
