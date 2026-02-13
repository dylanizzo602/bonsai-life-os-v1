/* Tasks page: Section header, reminders list, task list, Add/Edit Task modal, Add/Edit Reminder modal */

import { useState } from 'react'
import { AddButton } from '../../components/AddButton'
import { BellIcon } from '../../components/icons'
import { AddEditTaskModal } from './AddEditTaskModal'
import { TaskList } from './TaskList'
import { useTasks } from './hooks/useTasks'
import { AddEditReminderModal } from '../reminders'
import { useReminders } from '../reminders/hooks/useReminders'
import type { Task } from './types'
import type { Reminder } from '../reminders/types'

/**
 * Dropdown content for Add new task: "Add new reminder" option; click opens reminder modal.
 */
function AddTaskDropdownContent({ onAddReminder }: { onAddReminder: () => void }) {
  return (
    <button
      type="button"
      onClick={onAddReminder}
      className="flex flex-nowrap items-center justify-end gap-2 rounded px-2 py-1 text-body font-medium text-bonsai-brown-700 hover:bg-bonsai-slate-100 whitespace-nowrap w-full"
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
    refetch,
    createTask,
    updateTask,
    fetchSubtasks,
    createSubtask,
    deleteTask,
    toggleComplete,
    getTasks,
    getTaskDependencies,
    onAddDependency,
    onRemoveDependency,
  } = useTasks()

  const {
    reminders,
    loading: remindersLoading,
    error: remindersError,
    refetch: refetchReminders,
    createReminder: createReminderBase,
    updateReminder: updateReminderBase,
    toggleComplete: toggleReminderComplete,
  } = useReminders()

  /* Wrapper to refetch reminders after create/update to ensure list stays in sync */
  const createReminder = async (input: import('../reminders/types').CreateReminderInput) => {
    const result = await createReminderBase(input)
    /* Refetch to ensure we have the latest data from database */
    await refetchReminders()
    return result
  }

  const updateReminder = async (id: string, input: import('../reminders/types').UpdateReminderInput) => {
    const result = await updateReminderBase(id, input)
    /* Refetch to ensure we have the latest data from database */
    await refetchReminders()
    return result
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)

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

  const openAddReminder = () => {
    setEditReminder(null)
    setIsReminderModalOpen(true)
  }

  const openEditReminder = (reminder: Reminder) => {
    setEditReminder(reminder)
    setIsReminderModalOpen(true)
  }

  const closeReminderModal = () => {
    setIsReminderModalOpen(false)
    setEditReminder(null)
  }

  return (
    <div className="min-h-full">
      {/* Section header: Title on left, add button on right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Tasks</h1>
        <AddButton
          className="self-end sm:self-auto"
          aria-label="Add new task"
          dropdownContent={<AddTaskDropdownContent onAddReminder={openAddReminder} />}
          onClick={openAdd}
        >
          Add new task
        </AddButton>
      </div>

      {/* Task list: Includes both tasks and reminders in the same list */}
      <TaskList
        tasks={tasks}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={setFilters}
        refetch={refetch}
        updateTask={updateTask}
        deleteTask={deleteTask}
        toggleComplete={toggleComplete}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
        onOpenAddModal={openAdd}
        onOpenEditModal={openEdit}
        reminders={reminders}
        remindersLoading={remindersLoading}
        remindersError={remindersError}
        onToggleReminderComplete={toggleReminderComplete}
        onEditReminder={openEditReminder}
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
        onRemoveDependency={onRemoveDependency}
      />

      {/* Add/Edit reminder modal: opened from "Add new reminder" in dropdown or by clicking a reminder */}
      <AddEditReminderModal
        isOpen={isReminderModalOpen}
        onClose={closeReminderModal}
        onCreateReminder={createReminder}
        onUpdateReminder={updateReminder}
        reminder={editReminder}
      />
    </div>
  )
}
