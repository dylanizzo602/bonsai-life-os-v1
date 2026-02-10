/* TaskList component: Main task management interface with filtering and search */
import { useState } from 'react'
import { useTasks } from './hooks/useTasks'
import { TaskItem } from './TaskItem'
import { TaskForm } from './TaskForm'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Modal } from '../../components/Modal'
import type { Task, TaskPriority, TaskStatus } from './types'

/**
 * Main task list component with filtering, search, and CRUD operations
 * Displays tasks in a responsive grid with filter controls
 */
export function TaskList() {
  const {
    tasks,
    loading,
    error,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    fetchSubtasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskComplete,
  } = useTasks()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')

  // Handle search input with debounce effect
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setFilters({ ...filters, search: value || undefined })
  }

  // Open modal for creating new task
  const handleCreateNew = () => {
    setEditingTask(undefined)
    setIsModalOpen(true)
  }

  // Open modal for editing existing task
  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTask(undefined)
  }

  // Handle form submission (create or update)
  const handleSubmit = async (data: Parameters<typeof createTask>[0]) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data)
      } else {
        await createTask(data)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  // Wrapper functions to match component prop signatures
  const handleCreateSubtask = async (taskId: string, title: string) => {
    return createSubtask({ task_id: taskId, title })
  }

  // Filter options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ]

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  const dueDateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'no-date', label: 'No Date' },
  ]

  // Get unique categories from tasks
  const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean)))
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map((cat) => ({ value: cat!, label: cat! })),
  ]

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <Button onClick={handleCreateNew} variant="primary">
          + New Task
        </Button>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <Select
            value={filters.status || 'all'}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value === 'all' ? undefined : (e.target.value as TaskStatus),
              })
            }
            options={statusOptions}
          />
          <Select
            value={filters.priority || 'all'}
            onChange={(e) =>
              setFilters({
                ...filters,
                priority:
                  e.target.value === 'all' ? undefined : (e.target.value as TaskPriority),
              })
            }
            options={priorityOptions}
          />
          <Select
            value={filters.dueDateFilter || 'all'}
            onChange={(e) =>
              setFilters({
                ...filters,
                dueDateFilter:
                  e.target.value === 'all'
                    ? undefined
                    : (e.target.value as 'overdue' | 'today' | 'upcoming' | 'no-date'),
              })
            }
            options={dueDateOptions}
          />
        </div>
        {categories.length > 0 && (
          <Select
            label="Category"
            value={filters.category || 'all'}
            onChange={(e) =>
              setFilters({
                ...filters,
                category: e.target.value === 'all' ? undefined : e.target.value,
              })
            }
            options={categoryOptions}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-gray-500">Loading tasks...</div>
      )}

      {/* Tasks list */}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No tasks found</p>
          <p className="text-gray-400 text-sm mt-2">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters'
              : 'Create your first task to get started'}
          </p>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={toggleComplete}
              onDelete={deleteTask}
              onEdit={handleEdit}
              fetchSubtasks={fetchSubtasks}
              onCreateSubtask={handleCreateSubtask}
              onUpdateSubtask={updateSubtask}
              onDeleteSubtask={deleteSubtask}
              onToggleSubtaskComplete={toggleSubtaskComplete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  )
}
