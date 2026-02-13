/* AddEditSubtaskModal: Modal for adding/editing a subtask; full form state and sub-modals (no subtasks) */

import { useState, useEffect, useRef } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { useTaskChecklists } from './hooks/useTaskChecklists'
import { useTags } from './hooks/useTags'
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
  return 'open'
}

/** Map DisplayStatus back to TaskStatus for database updates */
function getTaskStatus(displayStatus: DisplayStatus): TaskStatus {
  if (displayStatus === 'complete') return 'completed'
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

export interface AddEditSubtaskModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when user submits Add Subtask; receives form data. May return the created task. */
  onCreateSubtask?: (input: CreateTaskInput) => Promise<unknown>
  /** If provided, after create this is called with the created task and the modal stays open in edit mode */
  onCreatedSubtask?: (task: Task) => void
  /** Existing subtask when editing; when set, modal is in edit mode */
  subtask?: Task | null
  /** Called when user saves edits */
  onUpdateTask?: (id: string, input: UpdateTaskInput) => Promise<Task>
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
  /** Called when dependencies change (e.g. to refetch parent list enrichment) */
  onDependenciesChanged?: () => void
}

/**
 * Add/Edit Subtask modal.
 * Full form state (title, description, dates, priority, tag, time estimate, attachments).
 * Pills open sub-modals to set each field. Submit creates or updates subtask.
 * Subtasks cannot have subtasks themselves.
 */
export function AddEditSubtaskModal({
  isOpen,
  onClose,
  onCreateSubtask,
  onCreatedSubtask,
  subtask = null,
  onUpdateTask,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onDependenciesChanged,
}: AddEditSubtaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [start_date, setStartDate] = useState<string | null>(null)
  const [due_date, setDueDate] = useState<string | null>(null)
  const [priority, setPriority] = useState<TaskPriority>('medium')
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
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})

  const isEditMode = Boolean(subtask?.id)
  const { checklists, loading: checklistsLoading, addChecklist, addItem, toggleItem } =
    useTaskChecklists(subtask?.id ?? null)
  const {
    searchTags,
    createTag,
    updateTag,
    deleteTagFromAllTasks,
    setTagsForTask,
  } = useTags(subtask?.user_id ?? null)

  /* Prefill form when editing or reset when opening for add */
  useEffect(() => {
    if (!isOpen) return
    if (subtask) {
      setTitle(subtask.title)
      setDescription(subtask.description ?? '')
      setStartDate(subtask.start_date ?? null)
      setDueDate(subtask.due_date ?? null)
      setPriority(subtask.priority ?? 'medium')
      setTags(Array.isArray(subtask.tags) ? subtask.tags : [])
      setTimeEstimate(subtask.time_estimate ?? null)
      setAttachments(Array.isArray(subtask.attachments) ? subtask.attachments : [])
      setStatus(getDisplayStatus(subtask.status))
    } else {
      setTitle('')
      setDescription('')
      setStartDate(null)
      setDueDate(null)
      setPriority('medium')
      setTags([])
      setTimeEstimate(null)
      setAttachments([])
      setStatus('open')
    }
  }, [isOpen, subtask])

  /* Submit: create or update subtask with all form fields */
  const handleSubmit = async () => {
    if (!title.trim()) return
    if (isEditMode && subtask && onUpdateTask) {
      setSubmitting(true)
      try {
        await onUpdateTask(subtask.id, {
          title: title.trim(),
          description: description.trim() || null,
          start_date: start_date || null,
          due_date: due_date || null,
          priority,
          time_estimate,
          attachments: attachments.length ? attachments : undefined,
          status: getTaskStatus(status),
        })
        await setTagsForTask(subtask.id, tags.map((t) => t.id))
        onClose()
      } catch {
        // Error handled by parent
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (!onCreateSubtask) return
    setSubmitting(true)
    try {
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        start_date: start_date || null,
        due_date: due_date || null,
        priority,
        time_estimate,
        attachments: attachments.length ? attachments : undefined,
        status: getTaskStatus(status),
      }
      const result = await onCreateSubtask(input)
      if (result && typeof result === 'object' && 'id' in result) {
        const createdSubtask = result as Task
        await setTagsForTask(createdSubtask.id, tags.map((t) => t.id))
        if (onCreatedSubtask) {
          onCreatedSubtask({ ...createdSubtask, tags })
          /* Modal stays open in edit mode; parent sets subtask to result */
        } else {
          setTitle('')
          setDescription('')
          setStartDate(null)
          setDueDate(null)
          setPriority('medium')
          setTags([])
          setTimeEstimate(null)
          setAttachments([])
          onClose()
        }
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
      title={isEditMode ? 'Edit Subtask' : 'Add Subtask'}
      fullScreenOnMobile
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
                : 'Add Subtask'}
          </Button>
        </>
      }
    >
      {/* Main subtask input: Status circle on left, input field on right */}
      <div className="mb-4 flex items-center gap-3">
        {/* Status circle: Clickable to open status picker popover, aligned with left edge of date picker button below */}
        <button
          ref={statusButtonRef}
          type="button"
          onClick={() => setStatusPickerOpen(true)}
          className="shrink-0 flex items-center justify-center rounded hover:bg-bonsai-slate-100 transition-colors"
          aria-label="Change subtask status"
        >
          <TaskStatusIndicator status={status} />
        </button>
        {/* Subtask title input: Takes remaining space */}
        <div className="flex-1">
          <Input
            placeholder="What needs to be done?"
            className="border-bonsai-slate-300"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      {/* Metadata pills: open sub-modals */}
      <div className="flex flex-wrap gap-2 mb-4">
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
        <button
          ref={priorityButtonRef}
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

      <StatusPickerModal
        isOpen={statusPickerOpen}
        onClose={() => setStatusPickerOpen(false)}
        value={status}
        triggerRef={statusButtonRef}
        onSelect={setStatus}
      />
      <DatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        startDate={start_date}
        dueDate={due_date}
        onSave={(start, due) => {
          setStartDate(start)
          setDueDate(due)
        }}
        triggerRef={datePickerButtonRef}
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
        taskId={subtask?.id ?? null}
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
      />
      {subtask?.id && onUpdateTask && (
        <>
          <AttachmentUploadModal
            isOpen={attachmentModalOpen}
            onClose={() => setAttachmentModalOpen(false)}
            taskId={subtask.id}
            existingAttachments={attachments}
            onUploadComplete={(list) => {
              setAttachments(list)
              onUpdateTask(subtask.id, { attachments: list })
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
          (description, attachments, breakdown)
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
            <p className="text-sm font-medium text-bonsai-slate-700 mb-2">Attachments</p>
            {!subtask?.id ? (
              <p className="text-sm text-bonsai-slate-500">Save the subtask first to add attachments.</p>
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
            {!subtask?.id ? (
              <p className="text-sm text-bonsai-slate-500">Create the subtask first to add checklists.</p>
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
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Task Dependencies</p>
            {subtask?.id && getTasks && getTaskDependencies && onAddDependency ? (
              <DependenciesSection
                currentTaskId={subtask.id}
                getTasks={getTasks}
                getTaskDependencies={getTaskDependencies}
                onAddDependency={onAddDependency}
                onRemoveDependency={onRemoveDependency}
                onDependenciesChanged={onDependenciesChanged}
              />
            ) : (
              <p className="text-sm text-bonsai-slate-500">
                Create the subtask first to add dependencies.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
