/* AddEditTaskModal: Modal for adding/editing a task; full form state, templates, and sub-modals */

import { useState, useEffect, useRef } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { Select } from '../../components/Select'
import { RichTextEditor } from '../notes/RichTextEditor'
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
  ChecklistIcon,
} from '../../components/icons'
import { parseRecurrencePattern, getNextOccurrence } from '../../lib/recurrence'
import { formatDateShort } from './utils/date'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import { DatePickerModal } from './modals/DatePickerModal'
import { PriorityPickerModal } from './modals/PriorityPickerModal'
import { TagModal } from './modals/TagModal'
import { TimeEstimateModal } from './modals/TimeEstimateModal'
import { DependenciesSection } from './DependenciesSection'
import { AttachmentUploadModal } from './modals/AttachmentUploadModal'
import { AttachmentPreviewModal } from './modals/AttachmentPreviewModal'
import { StatusPickerModal } from './modals/StatusPickerModal'
import { useTaskTemplates } from './hooks/useTaskTemplates'
import type { ChecklistWithItems } from './hooks/useTaskChecklists'
import type { TaskTemplate, TaskTemplateData } from './types'
import {
  createTaskChecklist,
  createChecklistItem,
  createSubtask,
  toggleChecklistItemComplete,
} from '../../lib/supabase/tasks'
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

/* Draft checklist item type: Local-only checklist entry used before the task has an id */
type DraftChecklistItem = { id: string; title: string; completed: boolean }

/* Draft checklist type: Local-only checklist used while creating a new task (no task id yet) */
type DraftChecklist = { id: string; title: string; items: DraftChecklistItem[] }

/** Instantiate checklists and subtasks for a newly created task from a template snapshot, preserving checklist item completion state for the main task and any subtasks. */
async function instantiateTemplateChildren(
  taskId: string,
  template: TaskTemplateData,
): Promise<void> {
  /* Instantiate main task checklists and their items using the template snapshot. */
  for (const cl of template.checklists) {
    const checklist = await createTaskChecklist({
      task_id: taskId,
      title: cl.title,
    })
    for (const item of cl.items) {
      const createdItem = await createChecklistItem({
        checklist_id: checklist.id,
        title: item.title,
      })
      if (item.completed) {
        await toggleChecklistItemComplete(createdItem.id, true)
      }
    }
  }

  /* Instantiate subtasks, and when present, recreate each subtask's checklists and items from the template snapshot. */
  for (const st of template.subtasks) {
    const createdSubtask = await createSubtask(taskId, {
      title: st.title,
      description: st.description,
      priority: st.priority,
      time_estimate: st.time_estimate,
      recurrence_pattern: st.recurrence_pattern,
    })

    if (st.checklists && st.checklists.length > 0) {
      for (const cl of st.checklists) {
        const subtaskChecklist = await createTaskChecklist({
          task_id: createdSubtask.id,
          title: cl.title,
        })
        for (const item of cl.items) {
          const createdItem = await createChecklistItem({
            checklist_id: subtaskChecklist.id,
            title: item.title,
          })
          if (item.completed) {
            await toggleChecklistItemComplete(createdItem.id, true)
          }
        }
      }
    }
  }
}

/* Instantiate locally drafted checklists and subtasks for a newly created task. */
async function instantiateDraftChildren(
  taskId: string,
  draftChecklists: DraftChecklist[],
  draftSubtasks: string[],
): Promise<void> {
  for (const cl of draftChecklists) {
    const checklist = await createTaskChecklist({
      task_id: taskId,
      title: cl.title,
    })
    for (const item of cl.items) {
      await createChecklistItem({
        checklist_id: checklist.id,
        title: item.title,
      })
    }
  }

  for (const title of draftSubtasks) {
    const trimmed = title.trim()
    if (!trimmed) continue
    await createSubtask(taskId, {
      title: trimmed,
      description: null,
      priority: 'medium',
      time_estimate: null,
      recurrence_pattern: null,
    })
  }
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
  /** Optional: Archive or unarchive the current task (matches right-click context menu behavior) */
  onArchiveTask?: (task: Task) => void | Promise<void>
  /** Optional: Soft-delete (move to trash) or restore the current task (matches right-click context menu behavior) */
  onMarkDeletedTask?: (task: Task) => void | Promise<void>
  /** Today's Lineup task IDs (for inline menu: Add/Remove from Today's Lineup) */
  lineUpTaskIds?: Set<string>
  onAddToLineUp?: (taskId: string) => void
  onRemoveFromLineUp?: (taskId: string) => void
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
  onArchiveTask,
  onMarkDeletedTask,
  lineUpTaskIds,
  onAddToLineUp,
  onRemoveFromLineUp,
  initialTitle,
}: AddEditTaskModalProps) {
  /* Profile time zone: format date pills consistently with task list and due logic */
  const timeZone = useUserTimeZone()
  /* Core task form state: title, description, dates, priority, goal, tags, estimate, attachments, status */
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
  /* Template state: applied template snapshot for add mode and inline template name prompt in edit mode */
  const [appliedTemplate, setAppliedTemplate] = useState<TaskTemplateData | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | ''>('')
  const [isNamingTemplate, setIsNamingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  /* Draft breakdown state: Local-only checklists and subtasks that can be created before the task exists */
  const [draftChecklists, setDraftChecklists] = useState<DraftChecklist[]>([])
  const [draftChecklistItemTitles, setDraftChecklistItemTitles] = useState<Record<string, string>>({})
  /* When user pastes multi-line text into checklist item input, we show a prompt to keep as 1 item or create many */
  const [pendingPasteLines, setPendingPasteLines] = useState<string[] | null>(null)
  /* Same for draft checklist item inputs: keyed by draft checklist id */
  const [pendingDraftPasteLines, setPendingDraftPasteLines] = useState<Record<string, string[]>>({})
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([])
  const [newDraftSubtaskTitle, setNewDraftSubtaskTitle] = useState('')
  /* Inline task actions menu: track open/closed state for three-dot menu in edit mode */
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)

  const isEditMode = Boolean(task?.id)
  const {
    checklists,
    loading: checklistsLoading,
    addChecklist,
    addItem,
    addItemOrCreateChecklist,
    addItemsOrCreateChecklist,
    updateChecklistTitle,
    toggleItem,
    updateItemTitle,
    deleteItem,
    deleteChecklist,
  } = useTaskChecklists(task?.id ?? null)
  const {
    searchTags,
    createTag,
    updateTag,
    deleteTagFromAllTasks,
    setTagsForTask,
  } = useTags(task?.user_id ?? null)
  const { goals } = useGoals()
  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    fetchTemplates,
    saveTemplateFromTask,
    removeTemplate,
  } = useTaskTemplates()

  /* Apply a template snapshot to the current form (dates and status stay as-is). */
  const applyTemplateToForm = (data: TaskTemplateData) => {
    setTitle(data.title)
    setDescription(data.description ?? '')
    setPriority(data.priority ?? 'medium')
    setGoalId(data.goal_id ?? null)
    setTimeEstimate(data.time_estimate ?? null)
    setAttachments(Array.isArray(data.attachments) ? data.attachments : [])
    setRecurrencePattern(data.recurrence_pattern ?? null)
    setTags(Array.isArray(data.tags) ? data.tags : [])
    setAppliedTemplate(data)
    /* When template has breakdown (checklists/subtasks), surface advanced section so user sees it. */
    if (data.checklists.length > 0 || data.subtasks.length > 0) {
      setAdvancedOpen(true)
    }
  }

  /* Load templates when modal opens (header template controls need data) */
  useEffect(() => {
    if (!isOpen) return
    void fetchTemplates()
  }, [isOpen, fetchTemplates])

  /* Prefill when modal opens or when switching tasks; do not depend on full `task` — parent often passes a new object reference on re-render, which would wipe local edits (e.g. priority set to None before Save) */
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
      /* Add mode: reset form and leave start/due empty so the date picker opens with no date selected by default */
      setTitle(initialTitle ?? '')
      setDescription('')
      setStartDate(null)
      setDueDate(null)
      setRecurrencePattern(null)
      setPriority('medium')
      setGoalId(null)
      setTags([])
      setTimeEstimate(null)
      setAttachments([])
      setStatus('open')
      setAppliedTemplate(null)
      setSelectedTemplateId('')
      setDraftChecklists([])
      setDraftChecklistItemTitles({})
      setDraftSubtasks([])
      setNewDraftSubtaskTitle('')
    }
  }, [isOpen, task?.id, initialTitle])

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
          /* Persist chosen priority; goal link no longer forces High on save (DB trigger removed). */
          priority,
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
        /* If a template was applied when creating, instantiate its checklists and subtasks for the new task. */
        if (appliedTemplate) {
          await instantiateTemplateChildren(createdTask.id, appliedTemplate)
        }
        /* After creating the task, instantiate any locally drafted checklists and subtasks. */
        if (draftChecklists.length > 0 || draftSubtasks.length > 0) {
          await instantiateDraftChildren(createdTask.id, draftChecklists, draftSubtasks)
        }
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

  /* Format date for pill display using the same zone as Settings / task list */
  const formatDate = (iso: string | null | undefined) => formatDateShort(iso, timeZone)
  const formatEstimate = (min: number | null) =>
    min == null ? null : min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`.replace(/ 0m$/, '')

  const headerTitle = (
    <div className="relative flex w-full items-center justify-between gap-3">
      <span className="text-body font-semibold text-bonsai-brown-700">
        {isEditMode ? 'Edit Task' : 'Add Task'}
      </span>
      {/* Template controls: apply in add mode, save template in edit mode */}
      {isEditMode && task ? (
        <div className="flex items-center gap-2">
          {isNamingTemplate && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Template name"
                className="border-bonsai-slate-300"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!templateName.trim() || savingTemplate}
                onClick={async () => {
                  if (!task) return
                  setSavingTemplate(true)
                  try {
                    const subtasksForTemplate = fetchSubtasks
                      ? await fetchSubtasks(task.id)
                      : []
                    await saveTemplateFromTask({
                      name: templateName.trim(),
                      task,
                      checklists: (checklists as ChecklistWithItems[]) ?? [],
                      subtasks: subtasksForTemplate,
                    })
                    setIsNamingTemplate(false)
                    setTemplateName('')
                  } catch {
                    // Error surfaced via hook error state
                  } finally {
                    setSavingTemplate(false)
                  }
                }}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsNamingTemplate(false)
                  setTemplateName('')
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          {!isNamingTemplate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsNamingTemplate(true)
                setTemplateName(task.title)
              }}
            >
              Save as task template
            </Button>
          )}
          {/* Three-dot task actions menu: duplicate, lineup, archive, trash (matches right-click options) */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Task options"
              onClick={() => setActionsMenuOpen((open) => !open)}
            >
              …
            </Button>
            {actionsMenuOpen && task && (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-bonsai-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100"
                  onClick={async () => {
                    if (!onCreateTask) {
                      setActionsMenuOpen(false)
                      return
                    }
                    try {
                      await onCreateTask({
                        title: `${task.title} (copy)`,
                        description: task.description ?? undefined,
                        start_date: task.start_date ?? undefined,
                        due_date: task.due_date ?? undefined,
                        priority: task.priority ?? 'medium',
                        time_estimate: task.time_estimate ?? undefined,
                        recurrence_pattern: task.recurrence_pattern ?? undefined,
                        status: 'active',
                        attachments: Array.isArray(task.attachments)
                          ? (task.attachments as TaskAttachment[])
                          : undefined,
                      })
                    } catch (err) {
                      console.error('Failed to duplicate task from edit modal:', err)
                    } finally {
                      setActionsMenuOpen(false)
                    }
                  }}
                >
                  Duplicate task
                </button>
                {lineUpTaskIds && onAddToLineUp && onRemoveFromLineUp && (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100"
                    onClick={() => {
                      const inLineUp = lineUpTaskIds.has(task.id)
                      if (inLineUp) {
                        onRemoveFromLineUp(task.id)
                      } else {
                        onAddToLineUp(task.id)
                      }
                      setActionsMenuOpen(false)
                    }}
                  >
                    {lineUpTaskIds.has(task.id)
                      ? "Remove from Today's Lineup"
                      : "Add to Today's Lineup"}
                  </button>
                )}
                {onArchiveTask && (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100"
                    onClick={async () => {
                      try {
                        await onArchiveTask(task)
                      } catch (err) {
                        console.error('Failed to archive/unarchive task from edit modal:', err)
                      } finally {
                        setActionsMenuOpen(false)
                      }
                    }}
                  >
                    {task.status === 'archived' ? 'Unarchive task' : 'Archive task'}
                  </button>
                )}
                {onMarkDeletedTask && (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100"
                    onClick={async () => {
                      try {
                        await onMarkDeletedTask(task)
                      } catch (err) {
                        console.error('Failed to move task to trash / restore from edit modal:', err)
                      } finally {
                        setActionsMenuOpen(false)
                      }
                    }}
                  >
                    {task.status === 'deleted' ? 'Restore from trash' : 'Move to trash'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Select
            value={selectedTemplateId}
            onChange={(e) => {
              const value = e.target.value
              setSelectedTemplateId(value)
              const template: TaskTemplate | undefined = templates.find((t) => t.id === value)
              if (template) {
                applyTemplateToForm(template.data)
              }
            }}
            options={[
              { value: '', label: templatesLoading ? 'Loading templates...' : 'No template' },
              ...templates.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplateManager((prev) => !prev)}
          >
            Manage
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={headerTitle}
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
      {showTemplateManager && !isEditMode && (
        <div className="mb-3 rounded-md border border-bonsai-slate-200 bg-bonsai-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-secondary text-bonsai-slate-700">Task templates</span>
            {templatesError && (
              <span className="text-xs text-red-600">{templatesError}</span>
            )}
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-bonsai-slate-500">
              No templates yet. Create a task, then use &quot;Save as task template&quot; in the
              Edit Task view.
            </p>
          ) : (
            <ul className="space-y-1">
              {templates.map((tmpl) => (
                <li
                  key={tmpl.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-bonsai-slate-100"
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-sm text-bonsai-slate-800"
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id)
                      applyTemplateToForm(tmpl.data)
                      setShowTemplateManager(false)
                    }}
                  >
                    {tmpl.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await removeTemplate(tmpl.id)
                      if (selectedTemplateId === tmpl.id) {
                        setSelectedTemplateId('')
                        setAppliedTemplate(null)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
        {/* Task title input: Takes remaining space; in edit mode persist on blur like description (footer has no Save) */}
        <div className="flex-1">
          <Input
            placeholder="What needs to be done?"
            className="border-bonsai-slate-300"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={async () => {
              /* Edit mode: persist title when user leaves the field so "auto-saved" matches behavior */
              if (!isEditMode || !task || !onUpdateTask) return
              const trimmed = title.trim()
              if (!trimmed) {
                setTitle(task.title)
                return
              }
              if (trimmed === task.title) return
              try {
                await onUpdateTask(task.id, { title: trimmed })
              } catch (error) {
                console.error('Failed to auto-save task title from modal:', error)
              }
            }}
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
        onSelect={async (newPriority) => {
          setPriority(newPriority)
          /* Edit mode: persist priority immediately (same pattern as status/description auto-save) */
          if (isEditMode && task && onUpdateTask) {
            try {
              await onUpdateTask(task.id, { priority: newPriority })
            } catch (err) {
              console.error('Failed to save priority from edit modal:', err)
            }
          }
        }}
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
        onSave={async (minutes) => {
          /* Update local pill immediately */
          setTimeEstimate(minutes)
          /* Edit mode: persist like dates and priority so Close does not drop the estimate */
          if (isEditMode && task && onUpdateTask) {
            try {
              await onUpdateTask(task.id, { time_estimate: minutes })
            } catch (err) {
              console.error('Failed to save time estimate from edit modal:', err)
            }
          }
        }}
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
            {/* Description: Rich text editor for notes/details, stores HTML string in description state and auto-saves in edit mode on blur */}
            <RichTextEditor
              editorKey={task?.id ?? 'new-task-description'}
              value={description}
              onBlur={async (html) => {
                setDescription(html)

                /* In edit mode, persist description changes immediately so closing the modal doesn't lose edits */
                if (isEditMode && task && onUpdateTask) {
                  try {
                    await onUpdateTask(task.id, {
                      description: html.trim() || null,
                    })
                  } catch (error) {
                    console.error('Failed to auto-save task description from modal:', error)
                  }
                }
              }}
              placeholder="Add notes or details..."
              className="w-full"
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
                /* Do not change priority when linking a goal — user and row picker control priority; DB no longer forces High */
              }}
            />
            {goal_id && (
              <p className="mt-1 text-xs text-bonsai-slate-500">
                Change priority anytime with the priority control above; linking a goal does not override it.
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
              <>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Create a checklist"
                    className="border-bonsai-slate-300 flex-1"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (!newChecklistTitle.trim()) return
                      if (e.key === 'Enter') {
                        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                          ? crypto.randomUUID()
                          : `draft-cl-${Date.now()}-${Math.random().toString(36).slice(2)}`
                        setDraftChecklists((prev) => [
                          ...prev,
                          { id, title: newChecklistTitle.trim(), items: [] },
                        ])
                        setNewChecklistTitle('')
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!newChecklistTitle.trim()) return
                      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                        ? crypto.randomUUID()
                        : `draft-cl-${Date.now()}-${Math.random().toString(36).slice(2)}`
                      setDraftChecklists((prev) => [
                        ...prev,
                        { id, title: newChecklistTitle.trim(), items: [] },
                      ])
                      setNewChecklistTitle('')
                    }}
                    disabled={!newChecklistTitle.trim()}
                  >
                    Add list
                  </Button>
                </div>
                {draftChecklists.length === 0 ? (
                  <p className="text-sm text-bonsai-slate-500">
                    Lists you create here will be saved when you save the task.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {draftChecklists.map((cl) => (
                      <li key={cl.id} className="rounded-lg border border-bonsai-slate-200 p-2">
                        {/* Draft checklist title: inline rename/delete (local state only until task is saved) */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            {editingChecklistId === cl.id ? (
                              <Input
                                className="border-bonsai-slate-300 flex-1 text-sm font-medium"
                                value={editingChecklistTitle}
                                onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const next = editingChecklistTitle.trim()
                                    if (next) {
                                      setDraftChecklists((prev) =>
                                        prev.map((d) =>
                                          d.id === cl.id ? { ...d, title: next } : d,
                                        ),
                                      )
                                    }
                                    setEditingChecklistId(null)
                                  }
                                  if (e.key === 'Escape') {
                                    e.stopPropagation()
                                    setEditingChecklistId(null)
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium text-bonsai-slate-700 flex-1">
                                {cl.title}
                              </p>
                            )}
                            <span className="text-xs text-bonsai-slate-500 shrink-0">
                              {cl.items.filter((i) => i.completed).length}/{cl.items.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (editingChecklistId === cl.id) {
                                  const next = editingChecklistTitle.trim()
                                  if (next) {
                                    setDraftChecklists((prev) =>
                                      prev.map((d) =>
                                        d.id === cl.id ? { ...d, title: next } : d,
                                      ),
                                    )
                                  }
                                  setEditingChecklistId(null)
                                } else {
                                  setEditingChecklistId(cl.id)
                                  setEditingChecklistTitle(cl.title)
                                }
                              }}
                            >
                              {editingChecklistId === cl.id ? 'Save' : 'Rename'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDraftChecklists((prev) => prev.filter((d) => d.id !== cl.id))
                                setDraftChecklistItemTitles((prev) => {
                                  const next = { ...prev }
                                  delete next[cl.id]
                                  return next
                                })
                                setPendingDraftPasteLines((prev) => {
                                  const next = { ...prev }
                                  delete next[cl.id]
                                  return next
                                })
                                if (editingChecklistId === cl.id) {
                                  setEditingChecklistId(null)
                                  setEditingChecklistTitle('')
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        {cl.items.length > 0 && (
                          <ul className="space-y-1 mb-2">
                            {cl.items
                              .filter((item) =>
                                showCompletedChecklistItems ? true : !item.completed,
                              )
                              .map((item) => (
                                <li key={item.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={item.completed}
                                    onChange={(e) =>
                                      setDraftChecklists((prev) =>
                                        prev.map((d) =>
                                          d.id !== cl.id
                                            ? d
                                            : {
                                                ...d,
                                                items: d.items.map((i) =>
                                                  i.id === item.id
                                                    ? { ...i, completed: e.target.checked }
                                                    : i,
                                                ),
                                              },
                                        ),
                                      )
                                    }
                                  />
                                  {editingItemId === item.id ? (
                                    <Input
                                      className="border-bonsai-slate-300 flex-1 text-sm"
                                      value={editingItemTitle}
                                      onChange={(e) => setEditingItemTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          const next = editingItemTitle.trim()
                                          if (next) {
                                            setDraftChecklists((prev) =>
                                              prev.map((d) =>
                                                d.id !== cl.id
                                                  ? d
                                                  : {
                                                      ...d,
                                                      items: d.items.map((i) =>
                                                        i.id === item.id ? { ...i, title: next } : i,
                                                      ),
                                                    },
                                              ),
                                            )
                                          }
                                          setEditingItemId(null)
                                        }
                                        if (e.key === 'Escape') {
                                          e.stopPropagation()
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
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (editingItemId === item.id) {
                                        const next = editingItemTitle.trim()
                                        if (next) {
                                          setDraftChecklists((prev) =>
                                            prev.map((d) =>
                                              d.id !== cl.id
                                                ? d
                                                : {
                                                    ...d,
                                                    items: d.items.map((i) =>
                                                      i.id === item.id ? { ...i, title: next } : i,
                                                    ),
                                                  },
                                            ),
                                          )
                                        }
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
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDraftChecklists((prev) =>
                                        prev.map((d) =>
                                          d.id !== cl.id
                                            ? d
                                            : {
                                                ...d,
                                                items: d.items.filter((i) => i.id !== item.id),
                                              },
                                        ),
                                      )
                                      if (editingItemId === item.id) setEditingItemId(null)
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </li>
                              ))}
                          </ul>
                        )}
                        {/* Draft: show/hide completed rows when any item is completed */}
                        {cl.items.some((i) => i.completed) && (
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
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add item"
                              className="border-bonsai-slate-300 flex-1 text-sm"
                              value={draftChecklistItemTitles[cl.id] ?? ''}
                              onChange={(e) =>
                                setDraftChecklistItemTitles((prev) => ({
                                  ...prev,
                                  [cl.id]: e.target.value,
                                }))
                              }
                              onPaste={(e) => {
                                const text = e.clipboardData.getData('text')
                                const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                                if (lines.length > 1) {
                                  e.preventDefault()
                                  setPendingDraftPasteLines((prev) => ({ ...prev, [cl.id]: lines }))
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const raw = draftChecklistItemTitles[cl.id] ?? ''
                                  const trimmed = raw.trim()
                                  if (!trimmed) return
                                  const itemId =
                                    typeof crypto !== 'undefined' && 'randomUUID' in crypto
                                      ? crypto.randomUUID()
                                      : `draft-item-${Date.now()}-${Math.random()
                                          .toString(36)
                                          .slice(2)}`
                                  setDraftChecklists((prev) =>
                                    prev.map((d) =>
                                      d.id === cl.id
                                        ? {
                                            ...d,
                                            items: [
                                              ...d.items,
                                              { id: itemId, title: trimmed, completed: false },
                                            ],
                                          }
                                        : d,
                                    ),
                                  )
                                  setDraftChecklistItemTitles((prev) => ({
                                    ...prev,
                                    [cl.id]: '',
                                  }))
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const raw = draftChecklistItemTitles[cl.id] ?? ''
                                const trimmed = raw.trim()
                                if (!trimmed) return
                                const itemId =
                                  typeof crypto !== 'undefined' && 'randomUUID' in crypto
                                    ? crypto.randomUUID()
                                    : `draft-item-${Date.now()}-${Math.random()
                                        .toString(36)
                                        .slice(2)}`
                                setDraftChecklists((prev) =>
                                  prev.map((d) =>
                                    d.id === cl.id
                                      ? {
                                          ...d,
                                          items: [
                                            ...d.items,
                                            { id: itemId, title: trimmed, completed: false },
                                          ],
                                        }
                                    : d,
                                  ),
                                )
                                setDraftChecklistItemTitles((prev) => ({
                                  ...prev,
                                  [cl.id]: '',
                                }))
                              }}
                              disabled={!((draftChecklistItemTitles[cl.id] ?? '').trim())}
                            >
                              Add
                            </Button>
                          </div>
                          {/* Multi-line paste prompt for this draft checklist */}
                          {pendingDraftPasteLines[cl.id] && pendingDraftPasteLines[cl.id].length > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2 text-body">
                              <span className="flex items-center gap-2 text-bonsai-slate-700">
                                <ChecklistIcon className="h-4 w-4 shrink-0 text-bonsai-slate-500" />
                                Multiple lines detected in the pasted text.
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const lines = pendingDraftPasteLines[cl.id]
                                    if (!lines) return
                                    const itemId =
                                      typeof crypto !== 'undefined' && 'randomUUID' in crypto
                                        ? crypto.randomUUID()
                                        : `draft-item-${Date.now()}-${Math.random().toString(36).slice(2)}`
                                    setDraftChecklists((prev) =>
                                      prev.map((d) =>
                                        d.id === cl.id
                                          ? {
                                              ...d,
                                              items: [
                                                ...d.items,
                                                { id: itemId, title: lines.join(' '), completed: false },
                                              ],
                                            }
                                          : d,
                                      ),
                                    )
                                    setDraftChecklistItemTitles((prev) => ({ ...prev, [cl.id]: '' }))
                                    setPendingDraftPasteLines((prev) => {
                                      const next = { ...prev }
                                      delete next[cl.id]
                                      return next
                                    })
                                  }}
                                >
                                  Keep 1 item
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    const lines = pendingDraftPasteLines[cl.id]
                                    if (!lines) return
                                    setDraftChecklists((prev) =>
                                      prev.map((d) =>
                                        d.id === cl.id
                                          ? {
                                              ...d,
                                              items: [
                                                ...d.items,
                                                ...lines.map((title) => ({
                                                  id:
                                                    typeof crypto !== 'undefined' && 'randomUUID' in crypto
                                                      ? crypto.randomUUID()
                                                      : `draft-item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                                  title,
                                                  completed: false,
                                                })),
                                              ],
                                            }
                                          : d,
                                      ),
                                    )
                                    setDraftChecklistItemTitles((prev) => ({ ...prev, [cl.id]: '' }))
                                    setPendingDraftPasteLines((prev) => {
                                      const next = { ...prev }
                                      delete next[cl.id]
                                      return next
                                    })
                                  }}
                                >
                                  Create {pendingDraftPasteLines[cl.id].length} items
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                {/* Single prompt: add a new checklist item; on first add creates checklist and adds item */}
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new checklist item"
                      className="border-bonsai-slate-300 flex-1"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text')
                        const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                        if (lines.length > 1) {
                          e.preventDefault()
                          setPendingPasteLines(lines)
                        }
                      }}
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
                  {/* Multi-line paste prompt: let user keep as one item or create one item per line */}
                  {pendingPasteLines && pendingPasteLines.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2 text-body">
                      <span className="flex items-center gap-2 text-bonsai-slate-700">
                        <ChecklistIcon className="h-4 w-4 shrink-0 text-bonsai-slate-500" />
                        Multiple lines detected in the pasted text.
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            addItemOrCreateChecklist(pendingPasteLines.join(' '))
                            setNewChecklistItem('')
                            setPendingPasteLines(null)
                          }}
                          disabled={checklistsLoading}
                        >
                          Keep 1 item
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            await addItemsOrCreateChecklist(pendingPasteLines)
                            setNewChecklistItem('')
                            setPendingPasteLines(null)
                          }}
                          disabled={checklistsLoading}
                        >
                          Create {pendingPasteLines.length} items
                        </Button>
                      </div>
                    </div>
                  )}
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
                                    e.preventDefault()
                                    updateChecklistTitle(c.id, editingChecklistTitle)
                                    setEditingChecklistId(null)
                                  }
                                  if (e.key === 'Escape') {
                                    e.stopPropagation()
                                    setEditingChecklistId(null)
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium text-bonsai-slate-700 flex-1">
                                {c.title}
                              </p>
                            )}
                            {/* Checklist count: completed items over total items for quick progress glance (shrink-0 so tally stays visible) */}
                            <span className="text-xs text-bonsai-slate-500 shrink-0">
                              {c.items.filter((item) => item.completed).length}/{c.items.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                deleteChecklist(c.id)
                                if (editingChecklistId === c.id) {
                                  setEditingChecklistId(null)
                                  setEditingChecklistTitle('')
                                }
                              }}
                            >
                              Delete
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
                                        e.preventDefault()
                                        updateItemTitle(item.id, editingItemTitle)
                                        setEditingItemId(null)
                                      }
                                      if (e.key === 'Escape') {
                                        e.stopPropagation()
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
                                  type="button"
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
                                  type="button"
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
              <>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a subtask"
                    className="border-bonsai-slate-300 flex-1 text-sm"
                    value={newDraftSubtaskTitle}
                    onChange={(e) => setNewDraftSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const trimmed = newDraftSubtaskTitle.trim()
                        if (!trimmed) return
                        setDraftSubtasks((prev) => [...prev, trimmed])
                        setNewDraftSubtaskTitle('')
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const trimmed = newDraftSubtaskTitle.trim()
                      if (!trimmed) return
                      setDraftSubtasks((prev) => [...prev, trimmed])
                      setNewDraftSubtaskTitle('')
                    }}
                    disabled={!newDraftSubtaskTitle.trim()}
                  >
                    Add
                  </Button>
                </div>
                {draftSubtasks.length === 0 ? (
                  <p className="text-sm text-bonsai-slate-500">
                    Subtasks you add here will be created when you save the task.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {draftSubtasks.map((st, index) => (
                      <li key={`${index}-${st}`} className="flex items-center gap-2">
                        <Checkbox checked={false} readOnly />
                        <span className="text-sm text-bonsai-slate-700 flex-1">{st}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
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
