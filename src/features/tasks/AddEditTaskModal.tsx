/* AddEditTaskModal: Modal for adding/editing a task; full form state and sub-modals */

import { useState, useEffect } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { useTaskChecklists } from './hooks/useTaskChecklists'
import { SubtaskList } from './SubtaskList'
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
  FlagIcon,
  TagIcon,
  HourglassIcon,
} from '../../components/icons'
import { DatePickerModal } from './modals/DatePickerModal'
import { PriorityModal } from './modals/PriorityModal'
import { TagModal } from './modals/TagModal'
import { TimeEstimateModal } from './modals/TimeEstimateModal'
import { TaskDependencyModal } from './modals/TaskDependencyModal'
import { AttachmentUploadModal } from './modals/AttachmentUploadModal'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTaskDependencyInput,
  TaskPriority,
  TaskAttachment,
} from './types'

export interface AddEditTaskModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when user submits Add Task; receives form data. May return the created task. */
  onCreateTask?: (input: CreateTaskInput) => Promise<unknown>
  /** If provided, after create this is called with the created task and the modal stays open in edit mode */
  onCreatedTask?: (task: Task) => void
  /** Existing task when editing; when set, modal is in edit mode */
  task?: Task | null
  /** Called when user saves edits */
  onUpdateTask?: (id: string, input: UpdateTaskInput) => Promise<Task>
  /** Fetch subtasks (for SubtaskList when editing) */
  fetchSubtasks?: (taskId: string) => Promise<Task[]>
  /** Create subtask */
  createSubtask?: (parentId: string, input: { title: string }) => Promise<Task>
  /** Update task (for subtask edits) */
  updateTask?: (id: string, input: UpdateTaskInput) => Promise<Task>
  /** Delete task (for subtasks) */
  deleteTask?: (id: string) => Promise<void>
  /** Toggle task completion (for subtasks) */
  toggleComplete?: (id: string, completed: boolean) => Promise<Task>
  /** Fetch all tasks (for dependency modal) */
  getTasks?: () => Promise<Task[]>
  /** Fetch task dependencies */
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('./types').TaskDependency[]
    blockedBy: import('./types').TaskDependency[]
  }>
  /** Create a task dependency */
  onAddDependency?: (input: CreateTaskDependencyInput) => Promise<void>
}

/**
 * Add/Edit Task modal.
 * Full form state (title, description, dates, priority, tag, time estimate, attachments).
 * Pills open sub-modals to set each field. Submit creates or updates task.
 */
export function AddEditTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  onCreatedTask,
  task = null,
  onUpdateTask,
  fetchSubtasks,
  createSubtask,
  updateTask,
  deleteTask,
  toggleComplete,
  getTasks,
  getTaskDependencies,
  onAddDependency,
}: AddEditTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [start_date, setStartDate] = useState<string | null>(null)
  const [due_date, setDueDate] = useState<string | null>(null)
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tag, setTag] = useState<string | null>(null)
  const [time_estimate, setTimeEstimate] = useState<number | null>(null)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [timeEstimateOpen, setTimeEstimateOpen] = useState(false)
  const [dependencyModalOpen, setDependencyModalOpen] = useState(false)
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})

  const isEditMode = Boolean(task?.id)
  const { checklists, loading: checklistsLoading, addChecklist, addItem, toggleItem } =
    useTaskChecklists(task?.id ?? null)

  /* Prefill form when editing or reset when opening for add */
  useEffect(() => {
    if (!isOpen) return
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStartDate(task.start_date ?? null)
      setDueDate(task.due_date ?? null)
      setPriority(task.priority ?? 'medium')
      setTag(task.tag ?? null)
      setTimeEstimate(task.time_estimate ?? null)
      setAttachments(Array.isArray(task.attachments) ? task.attachments : [])
    } else {
      setTitle('')
      setDescription('')
      setStartDate(null)
      setDueDate(null)
      setPriority('medium')
      setTag(null)
      setTimeEstimate(null)
      setAttachments([])
    }
  }, [isOpen, task])

  /* Submit: create or update task with all form fields */
  const handleSubmit = async () => {
    if (!title.trim()) return
    if (isEditMode && task && onUpdateTask) {
      setSubmitting(true)
      try {
        await onUpdateTask(task.id, {
          title: title.trim(),
          description: description.trim() || null,
          start_date: start_date || null,
          due_date: due_date || null,
          priority,
          tag: tag?.trim() || null,
          time_estimate,
          attachments: attachments.length ? attachments : undefined,
        })
        onClose()
      } catch {
        // Error handled by parent
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (!onCreateTask) return
    setSubmitting(true)
    try {
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        start_date: start_date || null,
        due_date: due_date || null,
        priority,
        tag: tag?.trim() || null,
        time_estimate,
        attachments: attachments.length ? attachments : undefined,
      }
      const result = await onCreateTask(input)
      if (onCreatedTask && result && typeof result === 'object' && 'id' in result) {
        onCreatedTask(result as Task)
        /* Modal stays open in edit mode; parent sets task to result */
      } else {
        setTitle('')
        setDescription('')
        setStartDate(null)
        setDueDate(null)
        setPriority('medium')
        setTag(null)
        setTimeEstimate(null)
        setAttachments([])
        onClose()
      }
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  /* Format date for pill display */
  const formatDate = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const formatEstimate = (min: number | null) =>
    min == null ? null : min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`.replace(/ 0m$/, '')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Task' : 'Add Task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
          >
            {submitting
              ? isEditMode
                ? 'Saving...'
                : 'Adding...'
              : isEditMode
                ? 'Save'
                : 'Add Task'}
          </Button>
        </>
      }
    >
      {/* Main task input */}
      <div className="mb-4">
        <Input
          placeholder="What needs to be done?"
          className="border-bonsai-slate-300"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Metadata pills: open sub-modals */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDatePickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <CalendarIcon className="w-4 h-4 text-bonsai-slate-600" />
          {formatDate(start_date) || formatDate(due_date)
            ? `Due: ${formatDate(due_date) ?? formatDate(start_date)}`
            : 'Add start/due date'}
        </button>
        <button
          type="button"
          onClick={() => setPriorityOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <FlagIcon className="w-4 h-4 text-bonsai-slate-600" />
          {priority !== 'medium' && priority !== 'none'
            ? `Priority: ${priority}`
            : priority === 'none'
              ? 'Priority: None'
              : 'Set priority'}
        </button>
        <button
          type="button"
          onClick={() => setTagOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <TagIcon className="w-4 h-4 text-bonsai-slate-600" />
          {tag ? tag : 'Add tags'}
        </button>
        <button
          type="button"
          onClick={() => setTimeEstimateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <HourglassIcon className="w-4 h-4 text-bonsai-slate-600" />
          {formatEstimate(time_estimate) ?? 'Add estimate'}
        </button>
      </div>

      <DatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        startDate={start_date}
        dueDate={due_date}
        onSave={(start, due) => {
          setStartDate(start)
          setDueDate(due)
        }}
      />
      <PriorityModal
        isOpen={priorityOpen}
        onClose={() => setPriorityOpen(false)}
        value={priority}
        onSelect={setPriority}
      />
      <TagModal
        isOpen={tagOpen}
        onClose={() => setTagOpen(false)}
        value={tag}
        onSave={setTag}
      />
      <TimeEstimateModal
        isOpen={timeEstimateOpen}
        onClose={() => setTimeEstimateOpen(false)}
        minutes={time_estimate}
        onSave={setTimeEstimate}
      />
      {task?.id && getTasks && getTaskDependencies && onAddDependency && (
        <TaskDependencyModal
          isOpen={dependencyModalOpen}
          onClose={() => setDependencyModalOpen(false)}
          currentTaskId={task.id}
          getTasks={getTasks}
          getTaskDependencies={getTaskDependencies}
          onAddDependency={onAddDependency}
        />
      )}
      {task?.id && onUpdateTask && (
        <AttachmentUploadModal
          isOpen={attachmentModalOpen}
          onClose={() => setAttachmentModalOpen(false)}
          taskId={task.id}
          existingAttachments={attachments}
          onUploadComplete={(list) => {
            setAttachments(list)
            onUpdateTask(task.id, { attachments: list })
          }}
        />
      )}

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-sm text-bonsai-slate-600 hover:text-bonsai-slate-800 mb-4"
      >
        {advancedOpen ? (
          <ChevronDownIcon className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 shrink-0" />
        )}
        <span className="font-medium">Advanced options</span>
        <span className="text-bonsai-slate-500 font-normal">
          (description, goals, attachments, breakdown)
        </span>
      </button>

      {/* Expanded advanced section */}
      {advancedOpen && (
        <div className="space-y-4 pt-2 border-t border-bonsai-slate-200">
          <div>
            <textarea
              placeholder="Add notes or details..."
              className="w-full min-h-[80px] rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Notes or details"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Attachments</p>
            {!task?.id ? (
              <p className="text-sm text-bonsai-slate-500">Save the task first to add attachments.</p>
            ) : (
              <button
                type="button"
                onClick={() => setAttachmentModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm font-medium text-bonsai-slate-600 hover:bg-bonsai-slate-50 hover:border-bonsai-slate-400 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add attachment
              </button>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Checklists</p>
            {!task?.id ? (
              <p className="text-sm text-bonsai-slate-500">Create the task first to add checklists.</p>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Create a new checklist"
                    className="border-bonsai-slate-300 flex-1"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addChecklist(newChecklistTitle)
                        setNewChecklistTitle('')
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      addChecklist(newChecklistTitle)
                      setNewChecklistTitle('')
                    }}
                    disabled={!newChecklistTitle.trim() || checklistsLoading}
                  >
                    Add
                  </Button>
                </div>
                {checklistsLoading && checklists.length === 0 ? (
                  <p className="text-sm text-bonsai-slate-500">Loading checklists...</p>
                ) : (
                  <ul className="space-y-3">
                    {checklists.map((c) => (
                      <li key={c.id} className="rounded-lg border border-bonsai-slate-200 p-2">
                        <p className="text-sm font-medium text-bonsai-slate-700 mb-2">{c.title}</p>
                        <ul className="space-y-1 mb-2">
                          {c.items.map((item) => (
                            <li key={item.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={item.completed}
                                onChange={(e) => toggleItem(item.id, e.target.checked)}
                              />
                              <span
                                className={
                                  item.completed
                                    ? 'text-sm text-bonsai-slate-500 line-through'
                                    : 'text-sm text-bonsai-slate-700'
                                }
                              >
                                {item.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add item"
                            className="border-bonsai-slate-300 flex-1 text-sm"
                            value={newItemTitles[c.id] ?? ''}
                            onChange={(e) =>
                              setNewItemTitles((prev) => ({ ...prev, [c.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addItem(c.id, newItemTitles[c.id] ?? '')
                                setNewItemTitles((prev) => ({ ...prev, [c.id]: '' }))
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              addItem(c.id, newItemTitles[c.id] ?? '')
                              setNewItemTitles((prev) => ({ ...prev, [c.id]: '' }))
                            }}
                            disabled={!((newItemTitles[c.id] ?? '').trim())}
                          >
                            Add
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Subtasks</p>
            {!task?.id ? (
              <p className="text-sm text-bonsai-slate-500">Create the task first to add subtasks.</p>
            ) : fetchSubtasks && createSubtask && updateTask && deleteTask && toggleComplete ? (
              <SubtaskList
                taskId={task.id}
                fetchSubtasks={fetchSubtasks}
                onCreateSubtask={(taskId, title) => createSubtask(taskId, { title })}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onToggleComplete={toggleComplete}
              />
            ) : (
              <p className="text-sm text-bonsai-slate-500">Subtask actions not provided.</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Task Dependencies</p>
            <button
              type="button"
              onClick={() => task?.id && setDependencyModalOpen(true)}
              disabled={!task?.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm font-medium text-bonsai-slate-600 hover:bg-bonsai-slate-50 hover:border-bonsai-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-4 h-4" />
              Link blocking or blocked-by tasks
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
