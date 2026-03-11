/* AddEditTaskModal: Modal for adding/editing a task; full form state and sub-modals */

import { useState, useEffect, useRef } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { Select } from '../../components/Select'
import { useTaskChecklists } from './hooks/useTaskChecklists'
import { useTags } from './hooks/useTags'
import { useGoals } from '../goals/hooks/useGoals'
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
import { parseRecurrencePattern, getNextOccurrence } from '../../lib/recurrence'
import { formatDateShort } from './utils/date'
import { DatePickerModal } from './modals/DatePickerModal'
import { PriorityPickerModal } from './modals/PriorityPickerModal'
import { TagModal } from './modals/TagModal'
import { TimeEstimateModal } from './modals/TimeEstimateModal'
import { DependenciesSection } from './DependenciesSection'
import { AttachmentUploadModal } from './modals/AttachmentUploadModal'
import { AttachmentPreviewModal } from './modals/AttachmentPreviewModal'
import { StatusPickerModal } from './modals/StatusPickerModal'
import type {
  Task,
  Tag,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTaskDependencyInput,
  TaskPriority,
  TaskStatus,
  TaskAttachment,
} from './types'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE (maps from TaskStatus) */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

/** Map TaskStatus to display status for the status circle */
function getDisplayStatus(status: TaskStatus): DisplayStatus {
  if (status === 'completed') return 'complete'
  if (status === 'in_progress') return 'in_progress'
  return 'open'
}

/** Map DisplayStatus back to TaskStatus for database updates */
function getTaskStatus(displayStatus: DisplayStatus): TaskStatus {
  if (displayStatus === 'complete') return 'completed'
  if (displayStatus === 'in_progress') return 'in_progress'
  return 'active'
}

/**
 * Status circle: OPEN = black dotted stroke no fill, IN PROGRESS = dotted yellow + fill, COMPLETE = solid green + fill.
 */
function TaskStatusIndicator({ status }: { status: DisplayStatus }) {
  const size = 20
  const r = (size - 4) / 2
  const cx = size / 2
  const cy = size / 2

  if (status === 'complete') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-green-500, #22c55e)"
          stroke="var(--color-green-600, #16a34a)"
          strokeWidth={2}
        />
      </svg>
    )
  }

  if (status === 'in_progress') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-yellow-400, #facc15)"
          stroke="var(--color-yellow-500, #eab308)"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      </svg>
    )
  }

  /* OPEN: black dotted stroke, no fill */
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="2 2"
        className="text-bonsai-slate-800"
      />
    </svg>
  )
}

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
  /** Toggle task completion (for subtasks only; main task completion happens in the list views) */
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
  /** Remove a task dependency by id */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** When adding (task is null), pre-fill the title (e.g. from Inbox "Convert to task") */
  initialTitle?: string
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
  onRemoveDependency,
  initialTitle,
}: AddEditTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [start_date, setStartDate] = useState<string | null>(null)
  const [due_date, setDueDate] = useState<string | null>(null)
  const [recurrence_pattern, setRecurrencePattern] = useState<string | null>(null)
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [goal_id, setGoalId] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [time_estimate, setTimeEstimate] = useState<number | null>(null)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [status, setStatus] = useState<DisplayStatus>('open')
  /* Advanced options: expanded by default on mobile (< 768px) for easier access */
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  )
  const [submitting, setSubmitting] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [timeEstimateOpen, setTimeEstimateOpen] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  /* Status button ref: Used to position the status popover */
  const statusButtonRef = useRef<HTMLButtonElement>(null)
  /* Priority button ref: Used to position the priority popover */
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  /* Tag button ref: Used to position the tag popover */
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  /* Date picker button ref: Used to position the date picker popover */
  const datePickerButtonRef = useRef<HTMLButtonElement>(null)
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})
  /* Checklist view: toggle whether completed/closed checklist items are visible (default: show closed) */
  const [showCompletedChecklistItems, setShowCompletedChecklistItems] = useState(true)
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')

  const isEditMode = Boolean(task?.id)
  const {
    checklists,
    loading: checklistsLoading,
    addChecklist,
    addItem,
    addItemOrCreateChecklist,
    updateChecklistTitle,
    toggleItem,
    updateItemTitle,
    deleteItem,
  } = useTaskChecklists(task?.id ?? null)
  const {
    searchTags,
    createTag,
    updateTag,
    deleteTagFromAllTasks,
    setTagsForTask,
  } = useTags(task?.user_id ?? null)
  const { goals } = useGoals()

  /* Prefill form when editing or reset when opening for add */
  useEffect(() => {
    if (!isOpen) return
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStartDate(task.start_date ?? null)
      setDueDate(task.due_date ?? null)
      setRecurrencePattern(task.recurrence_pattern ?? null)
      setPriority(task.priority ?? 'medium')
      setGoalId(task.goal_id ?? null)
      setTags(Array.isArray(task.tags) ? task.tags : [])
      setTimeEstimate(task.time_estimate ?? null)
      setAttachments(Array.isArray(task.attachments) ? task.attachments : [])
      setStatus(getDisplayStatus(task.status))
    } else {
      /* Add mode: default start and due to today (date-only, local) so user has a clear starting point */
      const todayYMD = new Date().toISOString().slice(0, 10)
      setTitle(initialTitle ?? '')
      setDescription('')
      setStartDate(todayYMD)
      setDueDate(todayYMD)
      setRecurrencePattern(null)
      setPriority('medium')
      setGoalId(null)
      setTags([])
      setTimeEstimate(null)
      setAttachments([])
      setStatus('open')
    }
  }, [isOpen, task, initialTitle])

  /* Submit: create or update task with all form fields (invoked by callers that still want explicit save) */
  const handleSubmit = async () => {
    if (!title.trim()) return
    if (isEditMode && task && onUpdateTask) {
      setSubmitting(true)
      try {
        const baseUpdate: UpdateTaskInput = {
          title: title.trim(),
          description: description.trim() || null,
          start_date: start_date || null,
          due_date: due_date || null,
          recurrence_pattern: recurrence_pattern ?? null,
          priority: goal_id ? 'high' : priority,
          goal_id: goal_id || null,
          time_estimate,
          attachments: attachments.length ? attachments : undefined,
        }
        /* Edit mode: update task fields only. Status changes are handled via task list status controls,
         * so we do not modify status here to avoid conflicting with recurring logic.
         */
        await onUpdateTask(task.id, baseUpdate)

        await setTagsForTask(task.id, tags.map((t) => t.id))
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
      /* When saving a recurring task with no start/due, set to next instance from today */
      let effectiveStart = start_date || null
      let effectiveDue = due_date || null
      if (recurrence_pattern && (!effectiveStart || !effectiveDue)) {
        const todayYMD = new Date().toISOString().slice(0, 10)
        const pattern = parseRecurrencePattern(recurrence_pattern)
        const nextYMD = pattern ? getNextOccurrence(pattern, todayYMD) : null
        const fallback = nextYMD ?? todayYMD
        if (!effectiveDue) effectiveDue = fallback
        if (!effectiveStart) effectiveStart = fallback
      }
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        start_date: effectiveStart,
        due_date: effectiveDue,
        recurrence_pattern: recurrence_pattern ?? null,
        priority,
        time_estimate,
        attachments: attachments.length ? attachments : undefined,
        status: getTaskStatus(status),
      }
      const result = await onCreateTask(input)
      if (result && typeof result === 'object' && 'id' in result) {
        const createdTask = result as Task
        await setTagsForTask(createdTask.id, tags.map((t) => t.id))
        if (onCreatedTask) {
          onCreatedTask({ ...createdTask, tags })
        }
        /* Always close modal and reset form after creating a task */
        setTitle('')
        setDescription('')
        setStartDate(null)
        setDueDate(null)
        setRecurrencePattern(null)
        setPriority('medium')
        setGoalId(null)
        setTags([])
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

  /* Format date for pill display (use local date so Feb 28 UTC midnight shows as Feb 28) */
  const formatDate = formatDateShort
  const formatEstimate = (min: number | null) =>
    min == null ? null : min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`.replace(/ 0m$/, '')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Task' : 'Add Task'}
      fullScreenOnMobile
      /* Footer: In edit mode, show auto-save message and Close button; in add mode, keep explicit Save */
      footer={
        isEditMode ? (
          <div className="flex w-full items-center justify-between">
            <span className="text-secondary text-bonsai-slate-500">
              Changes are automatically saved
            </span>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
            >
              {submitting ? 'Saving...' : 'Save Task'}
            </Button>
          </>
        )
      }
    >
      {/* Main task input: Status circle on left, input field on right */}
      <div className="mb-4 flex items-center gap-3">
        {/* Status circle: Clickable to open status picker popover, aligned with left edge of date picker button below */}
        <button
          ref={statusButtonRef}
          type="button"
          onClick={() => setStatusPickerOpen(true)}
          className="shrink-0 flex items-center justify-center rounded hover:bg-bonsai-slate-100 transition-colors"
          aria-label="Change task status"
        >
          <TaskStatusIndicator status={status} />
        </button>
        {/* Task title input: Takes remaining space */}
        <div className="flex-1">
          <Input
            placeholder="What needs to be done?"
            className="border-bonsai-slate-300"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            spellCheck
          />
        </div>
      </div>

      {/* Metadata pills: open sub-modals */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="inline-flex items-center gap-1">
          <button
            ref={datePickerButtonRef}
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
          >
            <CalendarIcon className="w-4 h-4 text-bonsai-slate-600" />
            {formatDate(start_date) || formatDate(due_date)
              ? `Due: ${formatDate(due_date) ?? formatDate(start_date)}`
              : 'Add start/due date'}
          </button>
          {(start_date || due_date) && (
            <button
              type="button"
              onClick={() => {
                setStartDate(null)
                setDueDate(null)
              }}
              className="rounded-full px-2 py-1.5 text-sm font-medium text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100 transition-colors"
              aria-label="Clear start and due date"
            >
              Clear
            </button>
          )}
        </div>
        <button
          ref={priorityButtonRef}
          type="button"
          onClick={() => setPriorityOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <FlagIcon className="w-4 h-4 text-bonsai-slate-600" />
          {priority === 'medium'
            ? 'Priority: Normal'
            : priority === 'none'
              ? 'Priority: None'
              : priority
                ? `Priority: ${priority}`
                : 'Set priority'}
        </button>
        <button
          ref={tagButtonRef}
          type="button"
          onClick={() => setTagOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <TagIcon className="w-4 h-4 shrink-0 text-bonsai-slate-600" />
          {tags.length > 0 ? (
            <span className="flex items-center gap-1">
              {tags.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    t.color === 'mint'
                      ? 'bg-emerald-100 text-emerald-800'
                      : t.color === 'blue'
                        ? 'bg-blue-100 text-blue-800'
                        : t.color === 'lavender'
                          ? 'bg-violet-100 text-violet-800'
                          : t.color === 'yellow'
                            ? 'bg-amber-100 text-amber-800'
                            : t.color === 'periwinkle'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-bonsai-slate-100 text-bonsai-slate-700'
                  }`}
                >
                  {t.name}
                </span>
              ))}
            </span>
          ) : (
            'Add tags'
          )}
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
        onSave={async (start, due, rec) => {
          /* When editing an existing task, persist date and recurrence changes immediately (including reopen checklist flag) */
          setStartDate(start)
          setDueDate(due)
          setRecurrencePattern(rec ?? null)

          if (isEditMode && task && onUpdateTask) {
            try {
              await onUpdateTask(task.id, {
                start_date: start,
                due_date: due,
                recurrence_pattern: rec ?? null,
              })
            } catch (error) {
              console.error('Failed to update task dates/recurrence from DatePickerModal:', error)
            }
          }
        }}
        triggerRef={datePickerButtonRef}
        recurrencePattern={recurrence_pattern}
        hasChecklists={(checklists?.length ?? 0) > 0}
      />
      <StatusPickerModal
        isOpen={statusPickerOpen}
        onClose={() => setStatusPickerOpen(false)}
        value={status}
        triggerRef={statusButtonRef}
        onSelect={async (newStatus) => {
          setStatus(newStatus)

          // In edit mode, immediately persist status changes using the shared task handlers
          if (isEditMode && task && onUpdateTask) {
            const nextTaskStatus = getTaskStatus(newStatus)
            try {
              if (nextTaskStatus === 'completed') {
                // Use shared completion handler for consistent recurring behavior when available
                if (toggleComplete) {
                  await toggleComplete(task.id, true)
                } else {
                  await onUpdateTask(task.id, { status: 'completed' })
                }
              } else {
                await onUpdateTask(task.id, { status: nextTaskStatus })
              }
            } catch (error) {
              console.error('Failed to update task status from modal:', error)
            }
          }
        }}
      />
      <PriorityPickerModal
        isOpen={priorityOpen}
        onClose={() => setPriorityOpen(false)}
        value={priority}
        triggerRef={priorityButtonRef}
        onSelect={setPriority}
      />
      <TagModal
        isOpen={tagOpen}
        onClose={() => setTagOpen(false)}
        value={tags}
        onSave={setTags}
        triggerRef={tagButtonRef}
        taskId={task?.id ?? null}
        searchTags={searchTags}
        createTag={createTag}
        updateTag={updateTag}
        deleteTagFromAllTasks={deleteTagFromAllTasks}
      />
      <TimeEstimateModal
        isOpen={timeEstimateOpen}
        onClose={() => setTimeEstimateOpen(false)}
        minutes={time_estimate}
        onSave={setTimeEstimate}
        taskId={task?.id ?? null}
        parentTaskMinutes={time_estimate}
      />
      {task?.id && onUpdateTask && (
        <>
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
          <AttachmentPreviewModal
            isOpen={previewAttachment !== null}
            onClose={() => setPreviewAttachment(null)}
            attachment={previewAttachment}
          />
        </>
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
              spellCheck
            />
          </div>

          {/* Goal picker */}
          <div>
            <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
              Link to Goal (optional)
            </label>
            <Select
              options={[
                { value: '', label: 'No goal' },
                ...goals.map((g) => ({ value: g.id, label: g.name })),
              ]}
              value={goal_id || ''}
              onChange={(e) => {
                const selectedGoalId = e.target.value || null
                setGoalId(selectedGoalId)
                /* Auto-set priority to high when goal is linked */
                if (selectedGoalId && priority !== 'high') {
                  setPriority('high')
                }
              }}
            />
            {goal_id && (
              <p className="mt-1 text-xs text-bonsai-slate-500">
                Task priority set to High automatically when linked to a goal
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-2">Attachments</p>
            {!task?.id ? (
              <p className="text-sm text-bonsai-slate-500">Save the task first to add attachments.</p>
            ) : (
              <div className="space-y-2">
                {/* Existing attachments: displayed as clickable items */}
                {attachments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {attachments.map((a) => {
                      const isImage = a.type?.startsWith('image/') ?? false
                      const fileName = a.name ?? 'Attachment'
                      return (
                        <button
                          key={a.url}
                          type="button"
                          onClick={() => setPreviewAttachment(a)}
                          className="flex items-center gap-2 rounded-lg border border-bonsai-slate-200 px-3 py-2 text-sm hover:bg-bonsai-slate-50 hover:border-bonsai-slate-300 transition-colors group"
                          title={`Click to preview: ${fileName}`}
                        >
                          {isImage ? (
                            <img
                              src={a.url}
                              alt={fileName}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-bonsai-slate-100 flex items-center justify-center text-bonsai-slate-500 text-xs font-medium">
                              {fileName.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'FILE'}
                            </div>
                          )}
                          <span className="text-bonsai-slate-700 group-hover:text-bonsai-sage-600 truncate max-w-[120px]">
                            {fileName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* Add attachment button */}
                <button
                  type="button"
                  onClick={() => setAttachmentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm font-medium text-bonsai-slate-600 hover:bg-bonsai-slate-50 hover:border-bonsai-slate-400 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add attachment
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Checklists</p>
            {!task?.id ? (
              <p className="text-sm text-bonsai-slate-500">Create the task first to add checklists.</p>
            ) : (
              <>
                {/* Single prompt: add a new checklist item; on first add creates checklist and adds item */}
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a new checklist item"
                    className="border-bonsai-slate-300 flex-1"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addItemOrCreateChecklist(newChecklistItem)
                        setNewChecklistItem('')
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      addItemOrCreateChecklist(newChecklistItem)
                      setNewChecklistItem('')
                    }}
                    disabled={!newChecklistItem.trim() || checklistsLoading}
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
                        {/* Checklist title row: name on the left with completed/total count on the right, editable via Rename */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            {editingChecklistId === c.id ? (
                              <Input
                                className="border-bonsai-slate-300 flex-1 text-sm font-medium"
                                value={editingChecklistTitle}
                                onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateChecklistTitle(c.id, editingChecklistTitle)
                                    setEditingChecklistId(null)
                                  }
                                  if (e.key === 'Escape') setEditingChecklistId(null)
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium text-bonsai-slate-700 flex-1">
                                {c.title}
                              </p>
                            )}
                            {/* Checklist count: completed items over total items for quick progress glance */}
                            <span className="text-xs text-bonsai-slate-500">
                              {c.items.filter((item) => item.completed).length}/{c.items.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (editingChecklistId === c.id) {
                                  updateChecklistTitle(c.id, editingChecklistTitle)
                                  setEditingChecklistId(null)
                                } else {
                                  setEditingChecklistId(c.id)
                                  setEditingChecklistTitle(c.title)
                                }
                              }}
                            >
                              {editingChecklistId === c.id ? 'Save' : 'Rename'}
                            </Button>
                          </div>
                        </div>
                        <ul className="space-y-1 mb-2">
                          {c.items
                            .filter((item) =>
                              showCompletedChecklistItems ? true : !item.completed,
                            )
                            .map((item) => (
                              <li key={item.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={item.completed}
                                  onChange={(e) => toggleItem(item.id, e.target.checked)}
                                />
                                {editingItemId === item.id ? (
                                  <Input
                                    className="border-bonsai-slate-300 flex-1 text-sm"
                                    value={editingItemTitle}
                                    onChange={(e) => setEditingItemTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateItemTitle(item.id, editingItemTitle)
                                        setEditingItemId(null)
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingItemId(null)
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className={
                                      item.completed
                                        ? 'text-sm text-bonsai-slate-500 line-through flex-1'
                                        : 'text-sm text-bonsai-slate-700 flex-1'
                                    }
                                  >
                                    {item.title}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (editingItemId === item.id) {
                                      updateItemTitle(item.id, editingItemTitle)
                                      setEditingItemId(null)
                                    } else {
                                      setEditingItemId(item.id)
                                      setEditingItemTitle(item.title)
                                    }
                                  }}
                                >
                                  {editingItemId === item.id ? 'Save' : 'Rename'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    deleteItem(item.id)
                                    if (editingItemId === item.id) {
                                      setEditingItemId(null)
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </li>
                            ))}
                        </ul>
                        {/* Checklist closed-items toggle: show or hide completed checklist entries for this task */}
                        {c.items.some((item) => item.completed) && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowCompletedChecklistItems((prev) => !prev)
                            }
                            className="mb-1 text-xs font-medium text-bonsai-slate-600 hover:text-bonsai-slate-800"
                          >
                            {showCompletedChecklistItems
                              ? 'Hide closed items'
                              : 'Show closed items'}
                          </button>
                        )}
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
                {/* Create another list: optional row when user wants a second checklist */}
                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder="Create another list"
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
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      addChecklist(newChecklistTitle)
                      setNewChecklistTitle('')
                    }}
                    disabled={!newChecklistTitle.trim() || checklistsLoading}
                  >
                    Add list
                  </Button>
                </div>
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
                getTasks={getTasks}
                getTaskDependencies={getTaskDependencies}
                onAddDependency={onAddDependency}
                allowCreateAndLink
              />
            ) : (
              <p className="text-sm text-bonsai-slate-500">Subtask actions not provided.</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Task Dependencies</p>
            {task?.id && getTasks && getTaskDependencies && onAddDependency ? (
              <DependenciesSection
                currentTaskId={task.id}
                getTasks={getTasks}
                getTaskDependencies={getTaskDependencies}
                onAddDependency={onAddDependency}
                onRemoveDependency={onRemoveDependency}
              />
            ) : (
              <p className="text-sm text-bonsai-slate-500">
                Create the task first to add dependencies.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
