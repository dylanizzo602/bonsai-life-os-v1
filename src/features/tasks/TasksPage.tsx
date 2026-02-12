/* Tasks page: Section header, Add/Edit Task modal, and task list placeholder */

import { useState } from 'react'
import { AddButton } from '../../components/AddButton'
import { BellIcon } from '../../components/icons'
import { AddEditTaskModal } from './AddEditTaskModal'
import { TaskList } from './TaskList'
import { useTasks } from './hooks/useTasks'
import type { Task } from './types'

/**
 * Dropdown content for Add new task: single "Add new reminder" option with bell icon.
 */
function AddTaskDropdownContent() {
  return (
    <button
      type="button"
      className="flex flex-nowrap items-center justify-end gap-2 rounded px-2 py-1 text-sm font-medium text-bonsai-brown-700 hover:bg-bonsai-slate-100 whitespace-nowrap md:text-base"
    >
      <BellIcon className="w-4 h-4 shrink-0 md:w-5 md:h-5 text-bonsai-brown-700" />
      Add new reminder
    </button>
  )
}

/**
 * Tasks page component.
 * Section header with Add new task button; Add/Edit Task modal with full fields and sub-modals.
 * Edit mode: pass task and handlers for subtasks, checklists, dependencies. After create, optionally reopen as edit.
 */
export function TasksPage() {
  const {
    tasks,
    loading,
    error,
    filters,
    setFilters,
    createTask,
    updateTask,
    fetchSubtasks,
    createSubtask,
    deleteTask,
    toggleComplete,
    getTasks,
    getTaskDependencies,
    onAddDependency,
  } = useTasks()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const openAdd = () => {
    setEditTask(null)
    setIsModalOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditTask(null)
  }

  return (
    <div className="min-h-full">
      {/* Section header: Title on left, add button on right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-bonsai-brown-700">Tasks</h1>
        <AddButton
          className="self-end sm:self-auto"
          aria-label="Add new task"
          dropdownContent={<AddTaskDropdownContent />}
          onClick={openAdd}
        >
          Add new task
        </AddButton>
      </div>

      {/* Task list: FullTaskItem on desktop; click opens edit modal */}
      <TaskList
        tasks={tasks}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={setFilters}
        updateTask={updateTask}
        deleteTask={deleteTask}
        toggleComplete={toggleComplete}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
        onOpenAddModal={openAdd}
        onOpenEditModal={openEdit}
      />

      {/* Add/Edit Task modal: full form, sub-modals, checklists, subtasks, dependencies */}
      <AddEditTaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onCreateTask={createTask}
        onCreatedTask={(task) => setEditTask(task)}
        task={editTask}
        onUpdateTask={updateTask}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        updateTask={updateTask}
        deleteTask={deleteTask}
        toggleComplete={toggleComplete}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
      />
    </div>
  )
}
