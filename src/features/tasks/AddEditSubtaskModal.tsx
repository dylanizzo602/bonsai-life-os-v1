/* AddEditSubtaskModal: Modal for adding/editing a subtask; full form state and sub-modals (no subtasks) */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { MaterialIcon } from '../../components/MaterialIcon'
import { TaskContextPopover } from './modals/TaskContextPopover'
import { isDesktopContextMenuViewport } from './utils/taskContextMenu'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { RichTextEditor } from '../notes/RichTextEditor'
import { useTaskChecklists } from './hooks/useTaskChecklists'
import { useTags } from './hooks/useTags'
import { useGoals } from '../goals/hooks/useGoals'
import { TaskStatusIndicator } from './TaskStatusIndicator'
import { useSmartQuickAdd } from './hooks/useSmartQuickAdd'
import type { SmartQuickAddResult } from './utils/smartQuickAdd'
import { PlusIcon, ChecklistIcon, FlagIcon } from '../../components/icons'
import { DatePickerModal } from './modals/DatePickerModal'
import { PriorityPickerModal } from './modals/PriorityPickerModal'
import { TagModal } from './modals/TagModal'
import { TimeEstimateModal } from './modals/TimeEstimateModal'
import { AttachmentUploadModal } from './modals/AttachmentUploadModal'
import { AttachmentPreviewModal } from './modals/AttachmentPreviewModal'
import { StatusPickerModal } from './modals/StatusPickerModal'
import { getPriorityFlagClasses, getPriorityLabel } from './utils/priority'
import {
  formatTimeEstimateMinutes,
  getLineupDateDisplay,
} from './utils/taskRowDisplay'
import type {
  Task,
  Tag,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTaskDependencyInput,
  TaskPriority,
  TaskStatus,
  TaskAttachment,
  TaskDependency,
} from './types'
import { useUserTimeZone } from '../settings/useUserTimeZone'

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

export interface AddEditSubtaskModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Parent task title (shown in the modal header for context when editing a subtask) */
  parentTaskTitle?: string | null
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
  /** Soft-delete (trash) or restore the subtask — matches task context menu behavior */
  onMarkDeletedTask?: (task: Task) => void | Promise<void>
  /** Called after the subtask is deleted so the parent list can refresh */
  onSubtaskDeleted?: () => void
  /** Duplicate the subtask (e.g. from ⋯ menu) */
  onDuplicateSubtask?: (task: Task) => Promise<void>
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
  parentTaskTitle = null,
  onCreateSubtask,
  onCreatedSubtask,
  subtask = null,
  onUpdateTask,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onDependenciesChanged,
  onMarkDeletedTask,
  onSubtaskDeleted,
  onDuplicateSubtask,
}: AddEditSubtaskModalProps) {
  /* Profile time zone: date pills match task list / Settings */
  const timeZone = useUserTimeZone()
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
  /* When user pastes multi-line text into the checklist add row */
  const [pendingPasteLines, setPendingPasteLines] = useState<string[] | null>(null)
  /* When user pastes multi-line text into a per-list item input */
  const [pendingDraftPasteLines, setPendingDraftPasteLines] = useState<Record<string, string[]>>({})
  /* Dependency options for Relationships section */
  const [dependencyTasks, setDependencyTasks] = useState<Task[]>([])
  const [taskDeps, setTaskDeps] = useState<{
    blockedBy: TaskDependency[]
    blocking: TaskDependency[]
  }>({ blockedBy: [], blocking: [] })

  const isEditMode = Boolean(subtask?.id)
  /* Edit modal: TaskContextPopover from ⋯ or desktop right-click */
  const [subtaskOptionsMenuOpen, setSubtaskOptionsMenuOpen] = useState(false)
  const [subtaskOptionsPosition, setSubtaskOptionsPosition] = useState({ x: 0, y: 0 })

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
    toggleItem,
    updateChecklistTitle,
    updateItemTitle,
    deleteItem,
    deleteChecklist,
  } = useTaskChecklists(subtask?.id ?? null)
  /* Inline edit state for checklist item title (Rename) */
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')
  /* Inline edit state for checklist title (Rename/Delete) */
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('')
  /* Whether to show or hide completed checklist items in each list */
  const [showCompletedChecklistItems, setShowCompletedChecklistItems] = useState(true)
  const {
    searchTags,
    createTag,
    updateTag,
    deleteTagFromAllTasks,
    setTagsForTask,
  } = useTags(subtask?.user_id ?? null)
  const { goals } = useGoals()

  /* Dependency task list: load when Advanced Details opens in edit mode */
  useEffect(() => {
    if (!advancedOpen) return
    if (!subtask?.id) return
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
  }, [advancedOpen, getTasks, subtask?.id])

  const refreshTaskDependencies = async () => {
    if (!subtask?.id || !getTaskDependencies) return
    try {
      const deps = await getTaskDependencies(subtask.id)
      setTaskDeps({ blockedBy: deps.blockedBy, blocking: deps.blocking })
      onDependenciesChanged?.()
    } catch {
      setTaskDeps({ blockedBy: [], blocking: [] })
    }
  }

  useEffect(() => {
    if (!advancedOpen || !subtask?.id || !getTaskDependencies) {
      setTaskDeps({ blockedBy: [], blocking: [] })
      return
    }
    let cancelled = false
    getTaskDependencies(subtask.id)
      .then((deps) => {
        if (!cancelled) {
          setTaskDeps({ blockedBy: deps.blockedBy, blocking: deps.blocking })
        }
      })
      .catch(() => {
        if (!cancelled) setTaskDeps({ blockedBy: [], blocking: [] })
      })
    return () => {
      cancelled = true
    }
  }, [advancedOpen, getTaskDependencies, subtask?.id])

  const dependencyTaskTitle = (taskId: string) =>
    dependencyTasks.find((t) => t.id === taskId)?.title ?? 'Unknown task'

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

  /* Auto-save: When editing an existing subtask, persist title changes so the parent list reflects updates immediately */
  const handleTitleAutoSave = async () => {
    if (!isEditMode || !subtask?.id || !onUpdateTask) return
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      await onUpdateTask(subtask.id, {
        title: trimmed,
      })
    } catch {
      // Error handled by parent; keep local state so user can retry
    }
  }

  /* Prefill when modal opens or subtask id changes; avoid `[isOpen, subtask]` so parent re-renders with a new subtask object reference do not wipe local priority/date edits before Save */
  useEffect(() => {
    if (!isOpen) return
    if (subtask) {
      setTitle(subtask.title)
      setDescription(subtask.description ?? '')
      setStartDate(subtask.start_date ?? null)
      setDueDate(subtask.due_date ?? null)
      setRecurrencePattern(subtask.recurrence_pattern ?? null)
      setPriority(subtask.priority ?? 'medium')
      setGoalId(subtask.goal_id ?? null)
      setTags(Array.isArray(subtask.tags) ? subtask.tags : [])
      setTimeEstimate(subtask.time_estimate ?? null)
      setAttachments(Array.isArray(subtask.attachments) ? subtask.attachments : [])
      setStatus(getDisplayStatus(subtask.status))
    } else {
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
      setStatus('open')
      resetSmartQuickAdd()
    }
  }, [isOpen, subtask?.id, resetSmartQuickAdd])

  /* Smart parse cleanup: cancel pending timer when modal closes/unmounts. */
  useEffect(() => () => cancelPendingParse(), [cancelPendingParse])

  /* Close ⋯ menu when subtask edit modal closes */
  useEffect(() => {
    if (!isOpen) setSubtaskOptionsMenuOpen(false)
  }, [isOpen])

  /* Submit: create or update subtask with all form fields (uses description HTML from rich text editor) */
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
          recurrence_pattern: recurrence_pattern ?? null,
          priority,
          goal_id,
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
      /* Parse once on submit so saved title and fields match the latest text. */
      const parsedOnSubmit = parseForSubmit(title)
      const cleanedTitle = parsedOnSubmit.cleanedTitle.trim() || title.trim()
      const submitTagNames = parsedOnSubmit.tagNames
      /* Smart estimate: if an explicit estimate token was typed, prefer it at create time. */
      const effectiveTimeEstimate = parsedOnSubmit.time_estimate != null ? parsedOnSubmit.time_estimate : time_estimate

      const input: CreateTaskInput = {
        title: cleanedTitle,
        description: description.trim() || null,
        start_date: start_date || null,
        due_date: due_date || null,
        recurrence_pattern: recurrence_pattern ?? null,
        priority,
        time_estimate: effectiveTimeEstimate,
        attachments: attachments.length ? attachments : undefined,
        status: getTaskStatus(status),
      }
      const result = await onCreateSubtask(input)
      if (result && typeof result === 'object' && 'id' in result) {
        const createdSubtask = result as Task
        /* Apply tags: merge selected pills with @tag tokens (auto-create missing). */
        const selectedIds = tags.map((t) => t.id)
        const smartIds = await resolveSmartTagIds(submitTagNames.length ? submitTagNames : smartTagNames)
        const mergedIds = Array.from(new Set([...selectedIds, ...smartIds]))
        await setTagsForTask(createdSubtask.id, mergedIds)
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
          resetSmartQuickAdd()
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

  /* Pill labels: match edit task modal */
  const datePillLabel =
    !start_date && !due_date
      ? 'Add Date'
      : getLineupDateDisplay({ start_date, due_date } as Task, timeZone) ?? 'Add Date'
  const priorityPillLabel =
    priority === 'none' ? 'Priority' : getPriorityLabel(priority)
  const tagsPillLabel =
    tags.length === 0
      ? 'Add Tags'
      : tags.length === 1
        ? tags[0].name
        : `${tags[0].name} (+${tags.length - 1})`
  const estimatePillLabel =
    time_estimate != null && time_estimate > 0
      ? formatTimeEstimateMinutes(time_estimate) ?? 'Add Estimate'
      : 'Add Estimate'

  /* Modal header: subtask title + parent context */
  const modalHeader = (
    <div className="px-4 py-4 border-b border-outline-variant/10 flex items-center justify-between md:px-8 md:py-6">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-headline font-bold text-on-surface">
          {isEditMode ? 'Edit Subtask' : 'New Subtask'}
        </h2>
        {parentTaskTitle ? (
          <p className="text-secondary text-on-surface-variant truncate mt-0.5">
            Subtask of {parentTaskTitle}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-1 hover:bg-surface-variant/50 rounded-full transition-colors"
        aria-label="Close"
      >
        <MaterialIcon name="close" className="text-on-surface-variant leading-none" />
      </button>
    </div>
  )

  /* Open subtask actions menu at screen position or below ⋯ */
  const openSubtaskOptionsMenuAt = (x: number, y: number) => {
    setSubtaskOptionsPosition({ x, y })
    setSubtaskOptionsMenuOpen(true)
  }

  const openSubtaskOptionsMenuFromAnchor = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect()
    openSubtaskOptionsMenuAt(
      Math.max(8, Math.min(rect.left, window.innerWidth - 288 - 8)),
      rect.bottom + 4,
    )
  }

  /* Desktop right-click in subtask edit modal: open subtask menu, not parent task menu */
  const handleSubtaskModalContextMenu = (e: MouseEvent) => {
    if (!subtask || !isEditMode || !isDesktopContextMenuViewport()) return
    e.preventDefault()
    e.stopPropagation()
    openSubtaskOptionsMenuAt(e.clientX, e.clientY)
  }

  /* Block context menu bubbling to parent task edit modal (prevents accidental parent delete) */
  const stopParentContextMenu = (e: MouseEvent) => {
    e.stopPropagation()
  }

  /* Modal header: parent context + ⋯ options in edit mode */
  const subtaskModalHeader = (
    <div
      className="flex items-center justify-between p-4 md:p-5 lg:p-6 border-b border-bonsai-slate-200"
      onContextMenu={stopParentContextMenu}
    >
      <div className="flex flex-col gap-0.5 text-body font-semibold text-bonsai-brown-700">
        <span>Edit Subtask</span>
        {parentTaskTitle ? (
          <span className="text-secondary font-normal text-bonsai-slate-600">
            {parentTaskTitle}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {onMarkDeletedTask ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Subtask options"
            onClick={(e) => {
              openSubtaskOptionsMenuFromAnchor(e.currentTarget)
            }}
          >
            …
          </Button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="text-bonsai-slate-400 hover:text-bonsai-slate-600 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded p-1"
          aria-label="Close modal"
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
      header={isEditMode ? subtaskModalHeader : modalHeader}
      fullScreenOnMobile
      overlayClassName="backdrop-blur-[12px] bg-black/15 md:p-4"
      cardClassName="bg-surface w-full shadow-2xl overflow-hidden flex flex-col md:max-w-2xl md:rounded-2xl md:max-h-[90vh] subtask-edit-modal"
      bodyClassName="p-0 md:px-8 md:py-8"
      footerClassName="px-4 py-4 bg-surface-variant/5 border-t border-outline-variant/10 gap-3 md:px-8 md:py-6"
      /* Footer: In edit mode, show auto-save message and Close button; in add mode, keep explicit Save/Add */
      footer={
        isEditMode ? (
          <div
            className="flex w-full items-center justify-between"
            onContextMenu={stopParentContextMenu}
          >
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
              {submitting ? 'Creating…' : 'Create Subtask'}
            </button>
          </>
        )
      }
    >
      <div
        className="space-y-6 px-4 py-6 md:px-0 md:py-0"
        onContextMenu={isEditMode ? handleSubtaskModalContextMenu : stopParentContextMenu}
      >
      {/* Title row: status circle + title with smart quick-add highlights in add mode */}
      <div className="flex items-start gap-3">
        <button
          ref={statusButtonRef}
          type="button"
          onClick={() => setStatusPickerOpen(true)}
          className="mt-0.5 shrink-0 flex items-center justify-center rounded hover:bg-surface-variant/30 transition-colors"
          aria-label="Change subtask status"
        >
          <TaskStatusIndicator status={status} size={20} />
        </button>
        <div className="relative flex-1 min-w-0">
          {/* Underlay: smart quick-add highlights while typing */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 flex items-center text-[15px] font-semibold leading-tight text-on-surface whitespace-pre-wrap ${
              smartMatches.length === 0 ? 'opacity-0' : ''
            }`}
          >
            <SmartQuickAddUnderlay value={title} matches={smartMatches} />
          </div>
          <input
            autoFocus
            className={`w-full bg-transparent border-none text-[15px] font-semibold leading-tight text-on-surface focus:ring-0 p-0 placeholder:text-outline-variant/50 ${
              smartMatches.length > 0 ? 'text-transparent caret-on-surface' : ''
            }`}
            placeholder="Subtask title"
            type="text"
            value={title}
            onChange={(e) => {
              const next = e.target.value
              setTitle(next)
              scheduleSmartParse(next)
            }}
            onBlur={handleTitleAutoSave}
            onKeyDown={(e) => {
              handleSmartTitleKeyDown(e, title)
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleTitleAutoSave()
              }
            }}
            spellCheck
          />
        </div>
      </div>

      {/* Quick action pills */}
      <div className="flex flex-wrap gap-2 overflow-visible">
        <div className="inline-flex shrink-0 items-center gap-1">
          <button
            ref={datePickerButtonRef}
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="flex shrink-0 items-center gap-1.5 overflow-visible whitespace-nowrap rounded-full border border-outline-variant/40 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
          >
            <MaterialIcon name="calendar_today" className="shrink-0 text-sm leading-none" />
            {datePillLabel}
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
          className="flex shrink-0 items-center gap-1.5 overflow-visible whitespace-nowrap rounded-full border border-outline-variant/40 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
        >
          <FlagIcon className={`h-4 w-4 shrink-0 ${getPriorityFlagClasses(priority)}`} />
          {priorityPillLabel}
        </button>
        <button
          ref={tagButtonRef}
          type="button"
          onClick={() => setTagOpen(true)}
          className="flex shrink-0 items-center gap-1.5 overflow-visible whitespace-nowrap rounded-full border border-outline-variant/40 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
        >
          <MaterialIcon name="sell" className="shrink-0 text-sm leading-none" />
          {tagsPillLabel}
        </button>
        <button
          type="button"
          onClick={() => setTimeEstimateOpen(true)}
          className="flex shrink-0 items-center gap-1.5 overflow-visible whitespace-nowrap rounded-full border border-outline-variant/40 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-variant/20 transition-colors"
        >
          <MaterialIcon name="timer" className="shrink-0 text-sm leading-none" />
          {estimatePillLabel}
        </button>
      </div>

      <StatusPickerModal
        isOpen={statusPickerOpen}
        onClose={() => setStatusPickerOpen(false)}
        value={status}
        triggerRef={statusButtonRef}
        onSelect={async (newStatus) => {
          setStatus(newStatus)
          /* In edit mode, persist status immediately so the change is saved without requiring Save */
          if (isEditMode && subtask?.id && onUpdateTask) {
            try {
              await onUpdateTask(subtask.id, { status: getTaskStatus(newStatus) })
            } catch {
              // Error handled by parent; keep local state so user can try Save or pick again
            }
          }
        }}
      />
      <DatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        startDate={start_date}
        dueDate={due_date}
        onSave={async (start, due, rec) => {
          setStartDate(start)
          setDueDate(due)
          setRecurrencePattern(rec ?? null)

          /* In edit mode, persist date and recurrence changes immediately so the change is saved without requiring Close */
          if (isEditMode && subtask && onUpdateTask) {
            try {
              await onUpdateTask(subtask.id, {
                start_date: start,
                due_date: due,
                recurrence_pattern: rec ?? null,
              })
            } catch {
              // Error handled by parent; keep local state so user can retry
            }
          }
        }}
        triggerRef={datePickerButtonRef}
        recurrencePattern={recurrence_pattern}
        hasChecklists={(checklists?.length ?? 0) > 0}
      />
      <PriorityPickerModal
        isOpen={priorityOpen}
        onClose={() => setPriorityOpen(false)}
        value={priority}
        triggerRef={priorityButtonRef}
        onSelect={async (newPriority) => {
          setPriority(newPriority)
          if (isEditMode && subtask?.id && onUpdateTask) {
            try {
              await onUpdateTask(subtask.id, { priority: newPriority })
            } catch (err) {
              console.error('Failed to save priority from subtask modal:', err)
            }
          }
        }}
      />
      <TagModal
        isOpen={tagOpen}
        onClose={() => setTagOpen(false)}
        value={tags}
        onSave={async (nextTags) => {
          setTags(nextTags)
          if (subtask?.id) {
            try {
              await setTagsForTask(
                subtask.id,
                nextTags.map((t) => t.id),
              )
            } catch (err) {
              console.error('Failed to save tags from subtask modal:', err)
            }
          }
        }}
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
        onSave={async (minutes) => {
          setTimeEstimate(minutes)
          /* Edit mode: persist so "automatically saved" matches task modal / date picker behavior */
          if (isEditMode && subtask && onUpdateTask) {
            try {
              await onUpdateTask(subtask.id, { time_estimate: minutes })
            } catch {
              // Error handled by parent; keep local state so user can retry
            }
          }
        }}
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

      {/* Advanced Details: same order as task modal (no subtasks section) */}
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
            <div className="w-full bg-surface-variant/10 border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary outline-none">
              <RichTextEditor
                editorKey={subtask?.id ?? 'new-subtask-description'}
                value={description ?? ''}
                placeholder="What needs to be done?"
                minHeightClassName="min-h-[120px]"
                onBlur={async (html) => {
                  setDescription(html)
                  if (isEditMode && subtask && onUpdateTask) {
                    try {
                      await onUpdateTask(subtask.id, {
                        description: html.trim() || null,
                      })
                    } catch (error) {
                      console.error('Failed to auto-save subtask description:', error)
                    }
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
              <MaterialIcon name="attach_file" className="text-base" />
              Attachments
            </label>
            {!subtask?.id ? (
              <div className="flex items-center gap-3 p-4 bg-surface-variant/5 border border-dashed border-outline-variant/40 rounded-xl text-sm text-on-surface-variant/50">
                <MaterialIcon name="upload_file" />
                <span>Save subtask first to enable attachments</span>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
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

          {/* Checklist */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
              <MaterialIcon name="checklist" className="text-base" />
              Checklist
            </label>
            {!subtask?.id ? (
              <p className="text-sm text-bonsai-slate-500">Create the subtask first to add checklists.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Create a checklist item"
                    type="text"
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
                      if (e.key !== 'Enter') return
                      const next = newChecklistItem.trim()
                      if (!next) return
                      void addItemOrCreateChecklist(next)
                      setNewChecklistItem('')
                    }}
                    disabled={checklistsLoading}
                  />
                  <button
                    type="button"
                    className="px-6 py-2 bg-surface-variant/20 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-variant/30 transition-colors disabled:opacity-50"
                    onClick={() => {
                      const next = newChecklistItem.trim()
                      if (!next) return
                      void addItemOrCreateChecklist(next)
                      setNewChecklistItem('')
                    }}
                    disabled={!newChecklistItem.trim() || checklistsLoading}
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Checklist lists (edit mode only) */}
          <div className="mt-4">
            {subtask?.id ? (
              <>
                {pendingPasteLines && pendingPasteLines.length > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2 text-body mb-3">
                    <span className="flex items-center gap-2 text-bonsai-slate-700">
                      <ChecklistIcon className="h-4 w-4 shrink-0 text-bonsai-slate-500" />
                      Multiple lines detected in the pasted text.
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          void addItemOrCreateChecklist(pendingPasteLines.join(' '))
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
                {checklistsLoading && checklists.length === 0 ? (
                  <p className="text-sm text-bonsai-slate-500">Loading checklists...</p>
                ) : (
                  <ul className="space-y-3">
                    {checklists.map((c) => (
                      <li key={c.id} className="rounded-lg border border-bonsai-slate-200 p-2">
                        {/* Checklist title row with completed/total tally and inline rename/delete controls */}
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
                                  if (editingItemId === item.id) setEditingItemId(null)
                                }}
                              >
                                Delete
                              </Button>
                            </li>
                          ))}
                        </ul>
                        {/* Show/hide closed checklist items for this list */}
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
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add item"
                              className="border-bonsai-slate-300 flex-1 text-sm"
                              value={newItemTitles[c.id] ?? ''}
                              onChange={(e) =>
                                setNewItemTitles((prev) => ({ ...prev, [c.id]: e.target.value }))
                              }
                              onPaste={(e) => {
                                const text = e.clipboardData.getData('text')
                                const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                                if (lines.length > 1) {
                                  e.preventDefault()
                                  setPendingDraftPasteLines((prev) => ({ ...prev, [c.id]: lines }))
                                }
                              }}
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
                          {/* Multi-line paste prompt: keep as one item or create one item per line */}
                          {pendingDraftPasteLines[c.id] && pendingDraftPasteLines[c.id].length > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2 text-body">
                              <span className="flex items-center gap-2 text-bonsai-slate-700">
                                <ChecklistIcon className="h-4 w-4 shrink-0 text-bonsai-slate-500" />
                                Multiple lines detected in the pasted text.
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={async () => {
                                    const lines = pendingDraftPasteLines[c.id]
                                    if (!lines) return
                                    await addItem(c.id, lines.join(' '))
                                    setNewItemTitles((prev) => ({ ...prev, [c.id]: '' }))
                                    setPendingDraftPasteLines((prev) => {
                                      const next = { ...prev }
                                      delete next[c.id]
                                      return next
                                    })
                                  }}
                                  disabled={checklistsLoading}
                                >
                                  Keep 1 item
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={async () => {
                                    const lines = pendingDraftPasteLines[c.id]
                                    if (!lines) return
                                    for (const lineTitle of lines) {
                                      await addItem(c.id, lineTitle)
                                    }
                                    setNewItemTitles((prev) => ({ ...prev, [c.id]: '' }))
                                    setPendingDraftPasteLines((prev) => {
                                      const next = { ...prev }
                                      delete next[c.id]
                                      return next
                                    })
                                  }}
                                  disabled={checklistsLoading}
                                >
                                  Create {pendingDraftPasteLines[c.id].length} items
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
            ) : null}
          </div>

          {/* Relationships & Links (no subtasks section) */}
          <div className="pt-8 border-t border-outline-variant/10 space-y-8">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Relationships &amp; Links
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                  <MaterialIcon name="link" className="text-base" />
                  Parent Task
                </label>
                {parentTaskTitle ? (
                  <div className="flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-variant/10 px-4 py-2.5">
                    <span className="flex-1 text-sm text-on-surface truncate">{parentTaskTitle}</span>
                  </div>
                ) : (
                  <p className="text-secondary text-on-surface-variant">No parent task</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                  <MaterialIcon name="emoji_events" className="text-base" />
                  Link to Goal
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                    value={goal_id || ''}
                    onChange={async (e) => {
                      const selectedGoalId = e.target.value || null
                      setGoalId(selectedGoalId)
                      if (isEditMode && subtask && onUpdateTask) {
                        try {
                          await onUpdateTask(subtask.id, { goal_id: selectedGoalId })
                        } catch (err) {
                          console.error('Failed to save goal from subtask modal:', err)
                        }
                      }
                    }}
                    disabled={!subtask?.id}
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
            </div>
            {subtask?.id && getTaskDependencies && onAddDependency ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                    <MaterialIcon name="link" className="text-base" />
                    Blocked by
                  </label>
                  {taskDeps.blockedBy.length > 0 ? (
                    <ul className="space-y-1.5 mb-2">
                      {taskDeps.blockedBy.map((dep) => (
                        <li
                          key={dep.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-variant/10 px-3 py-2 text-sm"
                        >
                          <span className="truncate">{dependencyTaskTitle(dep.blocker_id)}</span>
                          {onRemoveDependency ? (
                            <button
                              type="button"
                              className="shrink-0 text-secondary text-error hover:underline"
                              onClick={() => {
                                void onRemoveDependency(dep.id).then(() => refreshTaskDependencies())
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                      disabled={!onAddDependency}
                      defaultValue=""
                      onChange={(e) => {
                        const selected = e.target.value
                        if (!selected || !subtask?.id || !onAddDependency) return
                        void onAddDependency({
                          blocker_id: selected,
                          blocked_id: subtask.id,
                        }).then(() => refreshTaskDependencies())
                        e.currentTarget.value = ''
                      }}
                    >
                      <option value="">Select a task blocking this...</option>
                      {dependencyTasks
                        .filter((t) => t.id !== subtask.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline flex items-center gap-1.5">
                    <MaterialIcon name="link_off" className="text-base" />
                    Blocking
                  </label>
                  {taskDeps.blocking.length > 0 ? (
                    <ul className="space-y-1.5 mb-2">
                      {taskDeps.blocking.map((dep) => (
                        <li
                          key={dep.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-variant/10 px-3 py-2 text-sm"
                        >
                          <span className="truncate">{dependencyTaskTitle(dep.blocked_id)}</span>
                          {onRemoveDependency ? (
                            <button
                              type="button"
                              className="shrink-0 text-secondary text-error hover:underline"
                              onClick={() => {
                                void onRemoveDependency(dep.id).then(() => refreshTaskDependencies())
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                      disabled={!onAddDependency}
                      defaultValue=""
                      onChange={(e) => {
                        const selected = e.target.value
                        if (!selected || !subtask?.id || !onAddDependency) return
                        void onAddDependency({
                          blocker_id: subtask.id,
                          blocked_id: selected,
                        }).then(() => refreshTaskDependencies())
                        e.currentTarget.value = ''
                      }}
                    >
                      <option value="">Select a task this blocks...</option>
                      {dependencyTasks
                        .filter((t) => t.id !== subtask.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-bonsai-slate-500">
                Create the subtask first to manage dependencies.
              </p>
            )}
          </div>
        </div>
      </details>
      </div>

      {/* Subtask actions menu (⋯ or right-click in edit modal) */}
      {subtask && subtaskOptionsMenuOpen && onMarkDeletedTask ? (
        <TaskContextPopover
          isOpen
          allowMobile={!isDesktopContextMenuViewport()}
          hideOpenTask
          onClose={() => setSubtaskOptionsMenuOpen(false)}
          x={subtaskOptionsPosition.x}
          y={subtaskOptionsPosition.y}
          task={subtask}
          onOpenTask={() => setSubtaskOptionsMenuOpen(false)}
          onDuplicate={async (t) => {
            try {
              await onDuplicateSubtask?.(t)
            } catch (err) {
              console.error('Failed to duplicate subtask from edit modal menu:', err)
            }
          }}
          onMarkDeleted={async (t) => {
            try {
              await onMarkDeletedTask(t)
              onSubtaskDeleted?.()
              onClose()
            } catch (err) {
              console.error('Failed to delete subtask from edit modal menu:', err)
            }
          }}
        />
      ) : null}
    </Modal>
  )
}
