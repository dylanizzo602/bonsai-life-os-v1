/* AddEditTaskModal: Modal for adding/editing a task; full form state, templates, and sub-modals */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { MaterialIcon } from '../../components/MaterialIcon'
import { useTaskChecklists } from './hooks/useTaskChecklists'
import { useTags } from './hooks/useTags'
import { useGoals } from '../goals/hooks/useGoals'
import { SubtaskList } from './SubtaskList'
import {
  PlusIcon,
  ChecklistIcon,
} from '../../components/icons'
import { parseRecurrencePattern, getNextOccurrence } from '../../lib/recurrence'
import { formatDateShort } from './utils/date'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import { useSmartQuickAdd } from './hooks/useSmartQuickAdd'
import type { SmartQuickAddResult } from './utils/smartQuickAdd'
import { TaskContextPopover } from './modals/TaskContextPopover'
import {
  isDesktopContextMenuViewport,
  isTaskInLineupMenu,
} from './utils/taskContextMenu'
import { DatePickerModal } from './modals/DatePickerModal'
import { PriorityPickerModal } from './modals/PriorityPickerModal'
import { TagModal } from './modals/TagModal'
import { TimeEstimateModal } from './modals/TimeEstimateModal'
import { AttachmentUploadModal } from './modals/AttachmentUploadModal'
import { AttachmentPreviewModal } from './modals/AttachmentPreviewModal'
import { StatusPickerModal } from './modals/StatusPickerModal'
import { TaskStatusIndicator, getTaskStatusAriaLabel } from './TaskStatusIndicator'
import { TaskTemplatesModal } from './modals/TaskTemplatesModal'
import { RichTextEditor } from '../notes/RichTextEditor'
import { useTaskTemplates } from './hooks/useTaskTemplates'
import type { ChecklistWithItems } from './hooks/useTaskChecklists'
import type { TaskTemplateData } from './types'
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

/** Render highlighted smart tokens beneath a transparent input (Todoist-style). */
function SmartQuickAddUnderlay({
  value,
  matches,
}: {
  value: string
  matches: Array<{ start: number; end: number; kind: string }>
}) {
  /* Match styling: treat all recognized kinds the same in v1 (informational highlight only). */
  const highlightClass = 'bg-amber-100 text-bonsai-slate-900 rounded px-0.5'

  if (!value) {
    return <span className="text-transparent">.</span>
  }

  if (!matches || matches.length === 0) {
    return <span>{value}</span>
  }

  const parts: ReactNode[] = []
  let cursor = 0
  for (const m of matches) {
    const start = Math.max(0, Math.min(value.length, m.start))
    const end = Math.max(0, Math.min(value.length, m.end))
    if (end <= start) continue
    if (start > cursor) parts.push(<span key={`t-${cursor}`}>{value.slice(cursor, start)}</span>)
    parts.push(
      <mark key={`m-${start}-${end}`} className={highlightClass}>
        {value.slice(start, end)}
      </mark>,
    )
    cursor = end
  }
  if (cursor < value.length) parts.push(<span key={`t-${cursor}`}>{value.slice(cursor)}</span>)
  return <>{parts}</>
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
  /** Task IDs in Today's Lineup section (auto + manual) for menu labels */
  displayedLineupTaskIds?: Set<string>
  /** When true, task is in Today's Lineup (from parent when opening edit) */
  isInTodaysLineup?: boolean
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
  deleteTask: _deleteTask,
  toggleComplete,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onArchiveTask: _onArchiveTask,
  onMarkDeletedTask,
  lineUpTaskIds,
  displayedLineupTaskIds,
  isInTodaysLineup,
  onAddToLineUp,
  onRemoveFromLineUp,
  initialTitle,
}: AddEditTaskModalProps) {
  void onRemoveDependency
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
  /* Templates modal: new Library + Save Current flow */
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false)
  const [templatesModalInitialTab, setTemplatesModalInitialTab] = useState<
    'library' | 'saveCurrent'
  >('library')
  const [templatesModalSelectedTemplateId, setTemplatesModalSelectedTemplateId] = useState<string>('')
  const [templatesModalInitialName, setTemplatesModalInitialName] = useState<string | undefined>(
    undefined,
  )
  const [templatesModalInitialIcon, setTemplatesModalInitialIcon] = useState<string | undefined>(
    undefined,
  )
  /* Draft breakdown state: Local-only checklists and subtasks that can be created before the task exists */
  const [draftChecklists, setDraftChecklists] = useState<DraftChecklist[]>([])
  const [draftChecklistItemTitles, setDraftChecklistItemTitles] = useState<Record<string, string>>({})
  /* When user pastes multi-line text into checklist item input, we show a prompt to keep as 1 item or create many */
  const [pendingPasteLines, setPendingPasteLines] = useState<string[] | null>(null)
  /* Same for draft checklist item inputs: keyed by draft checklist id */
  const [pendingDraftPasteLines, setPendingDraftPasteLines] = useState<Record<string, string[]>>({})
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([])
  const [newDraftSubtaskTitle, setNewDraftSubtaskTitle] = useState('')
  /* Dependency options: cached task list for dependency selects in Advanced Details */
  const [dependencyTasks, setDependencyTasks] = useState<Task[]>([])
  /* Edit modal: TaskContextPopover from ⋯ or desktop right-click */
  const [taskOptionsMenuOpen, setTaskOptionsMenuOpen] = useState(false)
  const [taskOptionsPosition, setTaskOptionsPosition] = useState({ x: 0, y: 0 })
  const isEditMode = Boolean(task?.id)

  /* Smart quick add: parse title tokens, highlight matches, dismiss on backspace/delete in add mode. */
  const applySmartParsedFields = useCallback((parsed: SmartQuickAddResult) => {
    if (parsed.priority) setPriority(parsed.priority)
    if (parsed.due_date) setDueDate(parsed.due_date)
    if (parsed.time_estimate != null) setTimeEstimate(parsed.time_estimate)
    if (parsed.recurrence_pattern) setRecurrencePattern(parsed.recurrence_pattern)
  }, [])
  const {
    smartTagNames,
    smartMatches,
    scheduleSmartParse,
    handleSmartTitleKeyDown,
    parseForSubmit,
    resetSmartQuickAdd,
    cancelPendingParse,
  } = useSmartQuickAdd({
    isEditMode,
    applyParsedFields: applySmartParsedFields,
    fieldSetters: { setPriority, setDueDate, setTimeEstimate, setRecurrencePattern },
  })
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
    saveTemplateFromDraft,
    overwriteTemplateFromTask,
    overwriteTemplateFromDraft,
    removeTemplate,
  } = useTaskTemplates()
  void templatesLoading

  /* Dependency task list: load once when Advanced Details is opened in edit mode */
  useEffect(() => {
    if (!advancedOpen) return
    if (!task?.id) return
    if (!getTasks) return
    let cancelled = false
    getTasks()
      .then((list) => {
        if (!cancelled) setDependencyTasks(list)
      })
      .catch(() => {
        if (!cancelled) setDependencyTasks([])
      })
    return () => {
      cancelled = true
    }
  }, [advancedOpen, getTasks, task?.id])

  /* Tag resolution: map @tag names to tag ids (create missing tags), then merge with selected tags. */
  const resolveSmartTagIds = async (names: string[]): Promise<string[]> => {
    const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)))
    if (unique.length === 0) return []
    const resolved: string[] = []
    for (const name of unique) {
      const candidates = await searchTags(name)
      const exact = candidates.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (exact) {
        resolved.push(exact.id)
        continue
      }
      const created = await createTag(name, 'slate')
      resolved.push(created.id)
    }
    return resolved
  }

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

  /* Reset task action menu when modal closes */
  useEffect(() => {
    if (!isOpen) {
      setTaskOptionsMenuOpen(false)
    }
  }, [isOpen])

  /* Lineup membership for ⋯ / context menu (auto lineup + manual picks) */
  const editTaskInLineup =
    isInTodaysLineup ??
    (task != null
      ? isTaskInLineupMenu(task.id, lineUpTaskIds, displayedLineupTaskIds)
      : false)

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
      resetSmartQuickAdd()
    }
  }, [isOpen, task?.id, initialTitle, resetSmartQuickAdd])

  /* Smart parse cleanup: cancel pending timer when modal closes/unmounts. */
  useEffect(() => () => cancelPendingParse(), [cancelPendingParse])

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
      /* Parse once on submit so saved title and fields match the latest text. */
      const parsedOnSubmit = parseForSubmit(title)
      const cleanedTitle = parsedOnSubmit.cleanedTitle.trim() || title.trim()
      const submitTagNames = parsedOnSubmit.tagNames
      /* Smart estimate: if an explicit estimate token was typed, prefer it at create time. */
      const effectiveTimeEstimate = parsedOnSubmit.time_estimate != null ? parsedOnSubmit.time_estimate : time_estimate

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
        title: cleanedTitle,
        description: description.trim() || null,
        start_date: effectiveStart,
        due_date: effectiveDue,
        recurrence_pattern: recurrence_pattern ?? null,
        priority,
        time_estimate: effectiveTimeEstimate,
        attachments: attachments.length ? attachments : undefined,
        status: getTaskStatus(status),
      }
      const result = await onCreateTask(input)
      if (result && typeof result === 'object' && 'id' in result) {
        const createdTask = result as Task
        /* Apply tags: merge selected pills with @tag tokens (auto-create missing). */
        const selectedIds = tags.map((t) => t.id)
        const smartIds = await resolveSmartTagIds(submitTagNames.length ? submitTagNames : smartTagNames)
        const mergedIds = Array.from(new Set([...selectedIds, ...smartIds]))
        await setTagsForTask(createdTask.id, mergedIds)
        /* If a template was applied when creating, instantiate its checklists and subtasks for the new task. */
        if (appliedTemplate) {
          await instantiateTemplateChildren(createdTask.id, appliedTemplate)
        }
        /* After creating the task, instantiate any locally drafted checklists and subtasks. */
        if (draftChecklists.length > 0 || draftSubtasks.length > 0) {
          await instantiateDraftChildren(createdTask.id, draftChecklists, draftSubtasks)
        }
        if (onCreatedTask) onCreatedTask({ ...createdTask, tags })
        /* Always close modal and reset form after creating a task */
        setTitle('')
        setDescription('')
        setStartDate(null)
        setDueDate(null)
        setRecurrencePattern(null)
        setPriority('medium')
        setGoalId(null)
        setTags([])
        resetSmartQuickAdd()
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

  /* Date formatting: keep a local helper for sections that display date previews */
  const formatDate = (iso: string | null | undefined) => formatDateShort(iso, timeZone)
  void formatDate

  /* Duplicate current task (shared by desktop dropdown and mobile task menu) */
  const duplicateCurrentTask = async (source: Task) => {
    if (!onCreateTask) return
    await onCreateTask({
      title: `${source.title} (copy)`,
      description: source.description ?? undefined,
      start_date: source.start_date ?? undefined,
      due_date: source.due_date ?? undefined,
      priority: source.priority ?? 'medium',
      time_estimate: source.time_estimate ?? undefined,
      recurrence_pattern: source.recurrence_pattern ?? undefined,
      status: 'active',
      attachments: Array.isArray(source.attachments)
        ? (source.attachments as TaskAttachment[])
        : undefined,
    })
  }

  /* Open task actions menu at screen position or below ⋯ */
  const openTaskOptionsMenuAt = (x: number, y: number) => {
    setTaskOptionsPosition({ x, y })
    setTaskOptionsMenuOpen(true)
  }

  const openTaskOptionsMenuFromAnchor = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect()
    openTaskOptionsMenuAt(
      Math.max(8, Math.min(rect.left, window.innerWidth - 288 - 8)),
      rect.bottom + 4,
    )
  }

  /* Desktop right-click in edit modal: custom menu, not browser default */
  const handleEditModalContextMenu = (e: MouseEvent) => {
    if (!task || !isEditMode || !isDesktopContextMenuViewport()) return
    /* Ignore events from nested subtask edit modal so delete targets the subtask, not the parent */
    if ((e.target as HTMLElement).closest('.subtask-edit-modal')) return
    e.preventDefault()
    e.stopPropagation()
    openTaskOptionsMenuAt(e.clientX, e.clientY)
  }

  /* Modal header: match new design (title left, template controls + close on right) */
  const modalHeader = (
    <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between">
      <h2 className="text-lg font-headline font-bold text-on-surface">
        {isEditMode ? 'Edit Task' : 'New Task'}
      </h2>
      <div className="flex items-center gap-6">
        {/* Task templates: open the new Library/Save Current modal */}
        <button
          type="button"
          onClick={() => {
            setTemplatesModalInitialTab(isEditMode ? 'saveCurrent' : 'library')
            setTemplatesModalSelectedTemplateId('')
            setTemplatesModalInitialName(
              isEditMode && task
                ? task.title
                : selectedTemplateId
                  ? templates.find((t) => t.id === selectedTemplateId)?.name
                  : title,
            )
            setTemplatesModalInitialIcon(undefined)
            setTemplatesModalOpen(true)
          }}
          className="flex items-center gap-1.5 text-secondary font-medium text-on-surface-variant hover:text-primary transition-colors bg-surface-variant/20 px-3 py-1.5 rounded-lg"
        >
          <MaterialIcon name="content_copy" className="text-base" />
          {selectedTemplateId
            ? templates.find((t) => t.id === selectedTemplateId)?.name ?? 'Templates'
            : 'Templates'}
        </button>

        {/* Edit mode options menu (⋯) */}
        {isEditMode && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Task options"
            onClick={(e) => {
              openTaskOptionsMenuFromAnchor(e.currentTarget)
            }}
          >
            …
          </Button>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-surface-variant/50 rounded-full transition-colors"
          aria-label="Close"
        >
          <MaterialIcon name="close" className="text-on-surface-variant leading-none" />
        </button>
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={modalHeader}
      fullScreenOnMobile
      /* Overlay + card: match provided modal shell (blur backdrop + max width + rounded) */
      overlayClassName="p-4 backdrop-blur-[12px] bg-black/15 md:p-4"
      /* Mobile: full height; md+: constrain to 90vh like the mock */
      cardClassName="bg-surface w-full shadow-2xl overflow-hidden flex flex-col md:max-w-2xl md:rounded-2xl md:max-h-[90vh]"
      /* Body + footer wrappers: match provided padding/spacing */
      bodyClassName="px-4 py-6 space-y-8 md:px-8 md:py-8"
      footerClassName="px-4 py-6 bg-surface-variant/5 border-t border-outline-variant/10 gap-3 md:px-8 md:py-6"
      /* Footer: In edit mode, show auto-save message and Close button; in add mode, keep explicit Save */
      footer={
        isEditMode ? (
          <div className="flex w-full items-center justify-between">
            <span className="text-secondary text-on-surface-variant">
              Changes are automatically saved
            </span>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-on-surface-variant font-bold text-sm hover:bg-surface-variant/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="px-8 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-6" onContextMenu={handleEditModalContextMenu}>
      {/* 2. Main Content */}
      <div className="space-y-6">
        {/* Task title row: status circle opens picker; title input supports smart quick add in create mode */}
        <div className="flex items-start gap-3">
          <button
            ref={statusButtonRef}
            type="button"
            onClick={() => setStatusPickerOpen(true)}
            className="mt-1.5 shrink-0 flex items-center justify-center rounded hover:bg-surface-variant/30 transition-colors"
            aria-label={getTaskStatusAriaLabel(status)}
          >
            <TaskStatusIndicator status={status} size={24} />
          </button>
          <div className="relative flex-1 min-w-0">
            {/* Underlay: renders highlighted tokens for smart quick add */}
            {!isEditMode && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center text-3xl font-headline font-bold text-on-surface focus:ring-0 p-0 whitespace-pre-wrap"
              >
                <SmartQuickAddUnderlay value={title} matches={smartMatches} />
              </div>
            )}
            <input
              autoFocus
              className={`w-full bg-transparent border-none text-3xl font-headline font-bold text-on-surface focus:ring-0 p-0 placeholder:text-outline-variant/50 ${
                !isEditMode ? 'text-transparent caret-on-surface' : ''
              }`}
              placeholder="Task Title"
              type="text"
              value={title}
              onChange={(e) => {
                const next = e.target.value
                setTitle(next)
                scheduleSmartParse(next)
              }}
              onKeyDown={(e) => handleSmartTitleKeyDown(e, title)}
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
      </div>

      {/* Quick Action Buttons Row */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1">
          <button
            ref={datePickerButtonRef}
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
          >
            <MaterialIcon name="calendar_today" className="text-sm" />
            Add Date
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
        >
          <MaterialIcon name="flag" className="text-sm" />
          Priority: Normal
        </button>
        <button
          ref={tagButtonRef}
          type="button"
          onClick={() => setTagOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
        >
          <MaterialIcon name="sell" className="text-sm" />
          Add Tags
        </button>
        <button
          type="button"
          onClick={() => setTimeEstimateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
        >
          <MaterialIcon name="timer" className="text-sm" />
          Add Estimate
        </button>
      </div>

      <TaskTemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        mode={isEditMode ? 'edit' : 'add'}
        initialTab={templatesModalInitialTab}
        initialSelectedTemplateId={templatesModalSelectedTemplateId}
        initialTemplateName={templatesModalInitialName}
        initialTemplateIcon={templatesModalInitialIcon}
        templates={templates}
        templatesLoading={templatesLoading}
        templatesError={templatesError}
        onApplyTemplate={
          isEditMode
            ? undefined
            : (data, templateId) => {
                setSelectedTemplateId(templateId)
                applyTemplateToForm(data)
                setTemplatesModalOpen(false)
              }
        }
        onDeleteTemplate={async (id) => {
          await removeTemplate(id)
          if (selectedTemplateId === id) {
            setSelectedTemplateId('')
            setAppliedTemplate(null)
          }
        }}
        onCreateFromDraft={async (args) => {
          await saveTemplateFromDraft(args)
        }}
        onOverwriteFromDraft={async (args) => {
          await overwriteTemplateFromDraft(args)
        }}
        onCreateFromTask={async ({ name, icon, included }) => {
          if (!task) return
          const subtasksForTemplate = fetchSubtasks ? await fetchSubtasks(task.id) : []
          await saveTemplateFromTask({
            name,
            icon,
            included,
            task,
            checklists: (checklists as ChecklistWithItems[]) ?? [],
            subtasks: subtasksForTemplate,
          })
        }}
        onOverwriteFromTask={async ({ id, name, icon, included }) => {
          if (!task) return
          const subtasksForTemplate = fetchSubtasks ? await fetchSubtasks(task.id) : []
          await overwriteTemplateFromTask({
            id,
            name,
            icon,
            included,
            task,
            checklists: (checklists as ChecklistWithItems[]) ?? [],
            subtasks: subtasksForTemplate,
          })
        }}
        draft={{
          title,
          description,
          priority,
          goal_id: goal_id ?? null,
          time_estimate,
          attachments,
          recurrence_pattern,
          tags,
          draftChecklists: draftChecklists.map((cl) => ({
            title: cl.title,
            items: cl.items.map((item) => ({
              title: item.title,
              completed: item.completed,
            })),
          })),
          draftSubtasks,
        }}
      />

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

      {/* Advanced details accordion: collapsible container for optional sections */}
      <details
        className="group mt-4"
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center justify-between cursor-pointer list-none text-on-surface-variant hover:text-primary transition-colors py-2">
          <div className="flex items-center gap-2">
            <MaterialIcon
              name="expand_more"
              className="transition-transform group-open:rotate-180 text-lg"
            />
            <span className="text-xs font-bold uppercase tracking-wider">
              Advanced Details
            </span>
          </div>
          <div className="h-px flex-1 bg-outline-variant/20 ml-4" />
        </summary>
        <div className="pt-6 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline">
              Description &amp; Notes
            </label>
            {/* Description: Rich text editor stores HTML; edit mode auto-saves on blur */}
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
              placeholder="What needs to be done?"
              className="w-full bg-surface-variant/10 border border-outline-variant/30 rounded-xl px-4 py-3 min-h-[120px]"
            />
          </div>

          {/* Dependencies (new design) */}
          <div className="pt-8 border-t border-outline-variant/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                  <MaterialIcon name="link" className="text-base" />
                  Blocked by
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                    disabled={!task?.id || !onAddDependency}
                    defaultValue=""
                    onChange={(e) => {
                      const selected = e.target.value
                      if (!selected || !task?.id) return
                      if (!onAddDependency) return
                      void onAddDependency({ blocker_id: selected, blocked_id: task.id })
                      e.currentTarget.value = ''
                    }}
                  >
                    <option value="">Select a task blocking this...</option>
                    {dependencyTasks
                      .filter((t) => t.id !== task?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                  <MaterialIcon
                    name="search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline-variant text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                  <MaterialIcon name="link_off" className="text-base" />
                  Blocking
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                    disabled={!task?.id || !onAddDependency}
                    defaultValue=""
                    onChange={(e) => {
                      const selected = e.target.value
                      if (!selected || !task?.id) return
                      if (!onAddDependency) return
                      void onAddDependency({ blocker_id: task.id, blocked_id: selected })
                      e.currentTarget.value = ''
                    }}
                  >
                    <option value="">Select a task this blocks...</option>
                    {dependencyTasks
                      .filter((t) => t.id !== task?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                  <MaterialIcon
                    name="search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline-variant text-base"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Relationships & Links */}
          <div className="pt-8 border-t border-outline-variant/10">
            <div className="flex items-center gap-2 mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Relationships &amp; Links
              </span>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Link to Goal */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                    <MaterialIcon name="emoji_events" className="text-base" />
                    Link to Goal
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                      value={goal_id || ''}
                      onChange={(e) => {
                        const selectedGoalId = e.target.value || null
                        setGoalId(selectedGoalId)
                      }}
                    >
                      <option value="">No Goal Selected</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <MaterialIcon
                      name="swap_vert"
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline-variant text-base"
                    />
                  </div>
                </div>

                {/* Link to Parent Task (placeholder field for future wiring) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                    <MaterialIcon name="link" className="text-base" />
                    Link to Parent Task
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-outline-variant/50"
                      placeholder="URL or reference..."
                      type="text"
                      value={''}
                      onChange={() => {}}
                      disabled
                    />
                    <MaterialIcon
                      name="open_in_new"
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline-variant text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
              <MaterialIcon name="attach_file" className="text-base" />
              Attachments
            </label>
            {!task?.id ? (
              <div className="flex items-center gap-3 p-4 bg-surface-variant/5 border border-dashed border-outline-variant/40 rounded-xl text-sm text-on-surface-variant/50">
                <MaterialIcon name="upload_file" />
                <span>Save task first to enable attachments</span>
              </div>
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

          {/* Checklist (new design) */}
          <div className="space-y-3 mt-6">
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
              <MaterialIcon name="checklist" className="text-base" />
              Checklist
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                placeholder="Create a checklist item"
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const next = newChecklistItem.trim()
                  if (!next) return
                  addItemOrCreateChecklist(next)
                  setNewChecklistItem('')
                }}
                disabled={checklistsLoading}
              />
              <button
                type="button"
                className="px-6 py-2 bg-surface-variant/20 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-variant/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const next = newChecklistItem.trim()
                  if (!next) return
                  addItemOrCreateChecklist(next)
                  setNewChecklistItem('')
                }}
                disabled={!newChecklistItem.trim() || checklistsLoading}
              >
                Add
              </button>
            </div>
          </div>

          {/* Checklist (old UI hidden; logic remains for now) */}
          <div className="hidden">
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

          {/* Subtasks (new design) */}
          <div className="space-y-3 mt-6">
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
              <MaterialIcon name="account_tree" className="text-base" />
              Subtasks
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                placeholder="Add a subtask"
                type="text"
                value={newDraftSubtaskTitle}
                onChange={(e) => setNewDraftSubtaskTitle(e.target.value)}
              />
              <button
                type="button"
                className="px-6 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const trimmed = newDraftSubtaskTitle.trim()
                  if (!trimmed) return
                  if (!task?.id) {
                    setDraftSubtasks((prev) => [...prev, trimmed])
                    setNewDraftSubtaskTitle('')
                    return
                  }
                  if (!createSubtask) return
                  void (async () => {
                    await createSubtask(task.id, { title: trimmed })
                    setNewDraftSubtaskTitle('')
                  })()
                }}
                disabled={!newDraftSubtaskTitle.trim()}
              >
                Add
              </button>
            </div>
          </div>

          {/* Subtasks (old UI hidden; logic remains for now) */}
          <div className="hidden">
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
            ) : fetchSubtasks && createSubtask && updateTask && toggleComplete ? (
              <SubtaskList
                taskId={task.id}
                parentTaskTitle={task.title}
                fetchSubtasks={fetchSubtasks}
                onCreateSubtask={(taskId, title) => createSubtask(taskId, { title })}
                onUpdateTask={updateTask}
                onMarkDeletedTask={onMarkDeletedTask}
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

          {/* Dependencies (new design) - moved above Relationships & Links */}
          <div className="hidden" />
        </div>
      </details>

      </div>

      {/* Task actions menu (⋯ or right-click in edit modal) */}
      {task && taskOptionsMenuOpen ? (
        <TaskContextPopover
          isOpen
          allowMobile={!isDesktopContextMenuViewport()}
          hideOpenTask
          onClose={() => setTaskOptionsMenuOpen(false)}
          x={taskOptionsPosition.x}
          y={taskOptionsPosition.y}
          task={task}
          onOpenTask={() => setTaskOptionsMenuOpen(false)}
          onDuplicate={async (t) => {
            try {
              await duplicateCurrentTask(t)
            } catch (err) {
              console.error('Failed to duplicate task from edit modal menu:', err)
            }
          }}
          onMarkDeleted={onMarkDeletedTask}
          lineUpTaskIds={lineUpTaskIds}
          displayedLineupTaskIds={displayedLineupTaskIds}
          isInTodaysLineup={editTaskInLineup}
          onAddToLineUp={onAddToLineUp}
          onRemoveFromLineUp={onRemoveFromLineUp}
        />
      ) : null}
    </Modal>
  )
}
