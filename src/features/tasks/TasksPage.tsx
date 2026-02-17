/* Tasks page: Section header, view toolbar (Line Up / Available / All / Custom), Filter/Sort/Search, task list, Archive/Trash at bottom, Add/Edit modals */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddButton } from '../../components/AddButton'
import {
  BellIcon,
  FilterIcon,
  SortIcon,
  SearchIcon,
  LineUpIcon,
  ListIcon,
  InfinityIcon,
  CloseIcon,
  ChevronDownIcon,
} from '../../components/icons'
import { AddEditTaskModal } from './AddEditTaskModal'
import { TaskList } from './TaskList'
import { useTasks } from './hooks/useTasks'
import { AddEditReminderModal } from '../reminders'
import { useReminders } from '../reminders/hooks/useReminders'
import { getDependenciesForTaskIds } from '../../lib/supabase/tasks'
import { getSavedViews, createSavedView, updateSavedView, deleteSavedView } from '../../lib/supabase/savedViews'
import { useTags } from './hooks/useTags'
import { FilterModal } from './modals/FilterModal'
import { SortModal } from './modals/SortModal'
import type { Task } from './types'
import type { Reminder } from '../reminders/types'
import type { SortByEntry } from './types'
import type { FilterCondition } from './modals/FilterModal'
import type { SavedView } from '../../lib/supabase/savedViews'

const LINE_UP_STORAGE_KEY = 'bonsai-task-lineup'

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

/** Priority order for sort: higher index = higher priority (urgent last so it sorts first when desc) */
const PRIORITY_ORDER: Record<Task['priority'], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

/** Available view default filter (for display in Filter modal when in Available view); plan-aligned values */
const AVAILABLE_DEFAULT_FILTER_CONDITIONS: FilterCondition[] = [
  { id: 'av-status', field: 'status', operator: 'is_not', value: 'Complete' },
  { id: 'av-deps', field: 'dependencies', operator: 'doesnt_have', value: 'Waiting on' },
  { id: 'av-start', field: 'start_date', operator: 'is', value: 'Now & earlier' },
]

/** All Tasks view default filter (for display in Filter modal when in All Tasks view): only status is not Complete */
const ALL_DEFAULT_FILTER_CONDITIONS: FilterCondition[] = [
  { id: 'all-status', field: 'status', operator: 'is_not', value: 'Complete' },
]

/** Available view default sort (for display in Sort modal when in Available view): due date, priority, status */
const AVAILABLE_DEFAULT_SORT: SortByEntry[] = [
  { field: 'due_date', direction: 'asc' },
  { field: 'priority', direction: 'desc' },
  { field: 'status', direction: 'asc' },
]

/** Date preset helpers for filter: return [start, end] in ms or null for "not set" checks */
function getDateRangeForPreset(
  preset: string,
  kind: 'start' | 'due',
): { start: number; end: number } | null {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const dayMs = 24 * 60 * 60 * 1000
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6)
  nextWeekEnd.setHours(23, 59, 59, 999)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6)
  lastWeekEnd.setHours(23, 59, 59, 999)

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999)
  const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1)
  const lastMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59, 999)

  const lastYearStart = new Date(todayStart.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(todayStart.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
  const nextYearStart = new Date(todayStart.getFullYear() + 1, 0, 1)
  const nextYearEnd = new Date(todayStart.getFullYear() + 1, 11, 31, 23, 59, 59, 999)

  const quarter = Math.floor(todayStart.getMonth() / 3) + 1
  const thisQuarterStart = new Date(todayStart.getFullYear(), (quarter - 1) * 3, 1)
  const thisQuarterEnd = new Date(todayStart.getFullYear(), quarter * 3, 0, 23, 59, 59, 999)
  const lastQuarterStart = new Date(todayStart.getFullYear(), (quarter - 2) * 3, 1)
  const lastQuarterEnd = new Date(todayStart.getFullYear(), (quarter - 1) * 3, 0, 23, 59, 59, 999)
  const nextQuarterStart = new Date(todayStart.getFullYear(), quarter * 3, 1)
  const nextQuarterEnd = new Date(todayStart.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)

  switch (preset) {
    case 'Today':
      return { start: todayStart.getTime(), end: todayEnd.getTime() }
    case 'Yesterday': {
      const y = new Date(todayStart)
      y.setDate(y.getDate() - 1)
      const yEnd = new Date(y)
      yEnd.setHours(23, 59, 59, 999)
      return { start: y.getTime(), end: yEnd.getTime() }
    }
    case 'Tomorrow': {
      const t = new Date(todayStart)
      t.setDate(t.getDate() + 1)
      const tEnd = new Date(t)
      tEnd.setHours(23, 59, 59, 999)
      return { start: t.getTime(), end: tEnd.getTime() }
    }
    case 'Next 7 days': {
      const end = new Date(todayStart)
      end.setDate(end.getDate() + 7)
      end.setHours(23, 59, 59, 999)
      return { start: todayStart.getTime(), end: end.getTime() }
    }
    case 'Last 7 days': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 6)
      return { start: start.getTime(), end: todayEnd.getTime() }
    }
    case 'This week':
      return { start: weekStart.getTime(), end: weekEnd.getTime() }
    case 'Next week':
      return { start: nextWeekStart.getTime(), end: nextWeekEnd.getTime() }
    case 'Last week':
      return { start: lastWeekStart.getTime(), end: lastWeekEnd.getTime() }
    case 'Last month':
      return { start: lastMonthStart.getTime(), end: lastMonthEnd.getTime() }
    case 'This month':
      return { start: monthStart.getTime(), end: monthEnd.getTime() }
    case 'Next year':
      return { start: nextYearStart.getTime(), end: nextYearEnd.getTime() }
    case 'Last year':
      return { start: lastYearStart.getTime(), end: lastYearEnd.getTime() }
    case 'Today & earlier':
      return { start: 0, end: todayEnd.getTime() }
    case 'Now & earlier':
    case 'Now or earlier':
      return kind === 'start' ? { start: 0, end: now.getTime() } : null
    case 'Later than now':
    case 'Later':
      return kind === 'start' ? { start: now.getTime() + dayMs, end: Number.MAX_SAFE_INTEGER } : null
    case 'Last quarter':
      return { start: lastQuarterStart.getTime(), end: lastQuarterEnd.getTime() }
    case 'This quarter':
      return { start: thisQuarterStart.getTime(), end: thisQuarterEnd.getTime() }
    case 'Next quarter':
      return { start: nextQuarterStart.getTime(), end: nextQuarterEnd.getTime() }
    case 'Overdue':
      return kind === 'due' ? { start: 0, end: todayStart.getTime() - 1 } : null
    case 'Any date':
      return { start: 0, end: Number.MAX_SAFE_INTEGER }
    default:
      return null
  }
}

/** Parse encoded date value (exact:YYYY-MM-DD, before:YYYY-MM-DD, after:YYYY-MM-DD, range:start:end) into range and mode */
function parseDateValue(
  val: string,
): { start: number; end: number; mode: 'exact' | 'before' | 'after' | 'range' } | null {
  const dayMs = 24 * 60 * 60 * 1000
  const toRange = (d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
    const start = new Date(d + 'T00:00:00').getTime()
    if (Number.isNaN(start)) return null
    return { start, end: start + dayMs - 1 }
  }
  if (val.startsWith('exact:')) {
    const r = toRange(val.slice(6))
    return r ? { ...r, mode: 'exact' } : null
  }
  if (val.startsWith('before:')) {
    const r = toRange(val.slice(7))
    return r ? { ...r, mode: 'before' } : null
  }
  if (val.startsWith('after:')) {
    const r = toRange(val.slice(6))
    return r ? { ...r, mode: 'after' } : null
  }
  if (val.startsWith('range:')) {
    const parts = val.slice(6).split(':')
    if (parts.length < 2) return null
    const r1 = toRange(parts[0])
    const r2 = toRange(parts[1])
    if (!r1 || !r2) return null
    return { start: r1.start, end: r2.end, mode: 'range' }
  }
  return null
}

/** Evaluate one filter condition against a task; returns true if task matches. */
function evaluateFilterCondition(
  c: FilterCondition,
  t: Task,
  blockedIds: Set<string>,
  blockingIds: Set<string>,
): boolean {
  const val = (c.value ?? '').trim()
  const valLower = val.toLowerCase()
  const title = (t.title ?? '').toLowerCase()
  const statusMap: Record<string, Task['status']> = {
    open: 'active',
    'in progress': 'in_progress',
    closed: 'completed',
    complete: 'completed',
  }
  const priorityMap: Record<string, Task['priority']> = {
    none: 'none',
    low: 'low',
    medium: 'medium',
    normal: 'medium',
    high: 'high',
    urgent: 'urgent',
  }

  if (c.field === 'status') {
    const match = statusMap[valLower] ?? (c.value as Task['status'])
    if (c.operator === 'is') return t.status === match
    if (c.operator === 'is_not') return t.status !== match
    return true
  }

  if (c.field === 'task_name') {
    if (c.operator === 'contains') return title.includes(valLower)
    if (c.operator === 'does_not_contain') return !title.includes(valLower)
    return true
  }

  if (c.field === 'priority') {
    const effectivePriority = t.priority ?? 'medium'
    if (c.operator === 'is_set') return t.priority != null
    if (c.operator === 'is_not_set') return t.priority == null
    const match = priorityMap[valLower] ?? (c.value as Task['priority'])
    if (c.operator === 'is') return effectivePriority === match
    if (c.operator === 'is_not') return effectivePriority !== match
    return true
  }

  /* Resolve date range from preset name or encoded value (exact/before/after/range). */
  const getRangeForDateValue = (v: string, kind: 'start' | 'due') => {
    const parsed = parseDateValue(v)
    if (parsed) return parsed
    const presetRange = getDateRangeForPreset(v, kind)
    if (presetRange) return { ...presetRange, mode: 'exact' as const }
    return null
  }

  if (c.field === 'start_date') {
    const iso = t.start_date ? new Date(t.start_date).getTime() : null
    if (c.operator === 'is_set') return iso != null
    if (c.operator === 'is_not_set') return iso == null
    if (valLower === 'no date' && (c.operator === 'is' || c.operator === 'is_not')) {
      return c.operator === 'is' ? iso == null : iso != null
    }
    if (valLower === 'any date' && (c.operator === 'is' || c.operator === 'is_not')) {
      return c.operator === 'is' ? iso != null : iso == null
    }
    const range = getRangeForDateValue(val, 'start')
    if (range && c.operator === 'is') {
      /* "Now & earlier" / "Today & earlier": no start date means task is available now, so include */
      if (iso == null && (valLower === 'now & earlier' || valLower === 'today & earlier')) return true
      if (iso == null) return false
      if (range.mode === 'before') return iso < range.start
      if (range.mode === 'after') return iso > range.end
      return iso >= range.start && iso <= range.end
    }
    if (range && c.operator === 'is_not') {
      if (iso == null) return true
      if (range.mode === 'before') return iso >= range.start
      if (range.mode === 'after') return iso <= range.end
      return iso < range.start || iso > range.end
    }
    if (iso != null && range && c.operator === 'before') return iso < range.start
    if (iso != null && range && c.operator === 'after') return iso > range.end
    return true
  }

  if (c.field === 'due_date') {
    const iso = t.due_date ? new Date(t.due_date).getTime() : null
    if (c.operator === 'is_set') return iso != null
    if (c.operator === 'is_not_set') return iso == null
    if (valLower === 'no date' && (c.operator === 'is' || c.operator === 'is_not')) {
      return c.operator === 'is' ? iso == null : iso != null
    }
    if (valLower === 'any date' && (c.operator === 'is' || c.operator === 'is_not')) {
      return c.operator === 'is' ? iso != null : iso == null
    }
    const range = getRangeForDateValue(val, 'due')
    if (range && c.operator === 'is') {
      if (iso == null) return false
      if (range.mode === 'before') return iso < range.start
      if (range.mode === 'after') return iso > range.end
      return iso >= range.start && iso <= range.end
    }
    if (range && c.operator === 'is_not') {
      if (iso == null) return true
      if (range.mode === 'before') return iso >= range.start
      if (range.mode === 'after') return iso <= range.end
      return iso < range.start || iso > range.end
    }
    if (iso != null && range && c.operator === 'before') return iso < range.start
    if (iso != null && range && c.operator === 'after') return iso > range.end
    return true
  }

  if (c.field === 'tags') {
    const taskTagNames = (t.tags ?? []).map((tag) => (tag.name ?? '').toLowerCase())
    const hasNoTags = taskTagNames.length === 0
    if (c.operator === 'is_set') return !hasNoTags
    if (c.operator === 'is_not_set') return hasNoTags
    const selected = (c.value ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const noTagsSelected = selected.includes('no tags')
    const tagNamesSelected = selected.filter((s) => s !== 'no tags')
    /* Is: task has at least one of the selected tags, or has no tags when "No tags" is selected */
    if (c.operator === 'is') {
      if (noTagsSelected && hasNoTags) return true
      if (tagNamesSelected.length === 0) return noTagsSelected ? hasNoTags : true
      return tagNamesSelected.some((name) => taskTagNames.includes(name))
    }
    /* Is Not: task has none of the selected tags; if "No tags" selected, task must have at least one tag */
    if (c.operator === 'is_not') {
      if (noTagsSelected && hasNoTags) return false
      if (noTagsSelected && !hasNoTags) return true
      if (tagNamesSelected.length === 0) return true
      return !tagNamesSelected.some((name) => taskTagNames.includes(name))
    }
    return true
  }

  if (c.field === 'dependencies') {
    const waitingOn = blockedIds.has(t.id)
    const blocking = blockingIds.has(t.id)
    const hasAny = waitingOn || blocking
    if (valLower === 'waiting on') {
      return c.operator === 'has' ? waitingOn : !waitingOn
    }
    if (valLower === 'blocking') {
      return c.operator === 'has' ? blocking : !blocking
    }
    if (valLower === 'any') {
      return c.operator === 'has' ? hasAny : !hasAny
    }
    return true
  }

  if (c.field === 'recurring') {
    const isRecurring = Boolean(t.recurrence_pattern)
    if (c.operator === 'is_recurring') return isRecurring
    if (c.operator === 'is_not_recurring') return !isRecurring
    return true
  }

  if (c.field === 'time_estimate') {
    const mins = t.time_estimate ?? 0
    if (c.operator === 'is_set') return t.time_estimate != null && t.time_estimate > 0
    if (c.operator === 'is_not_set') return t.time_estimate == null || t.time_estimate === 0
    const num = Number(c.value)
    if (Number.isNaN(num)) return true
    if (c.operator === 'greater_than') return mins > num
    if (c.operator === 'less_than') return mins < num
    if (c.operator === 'equal_to') return mins === num
    return true
  }

  return true
}

/** Evaluate one filter condition against a reminder; returns true if reminder matches. Only supports due_date and task_name fields. */
function evaluateFilterConditionForReminder(c: FilterCondition, r: Reminder): boolean {
  const val = (c.value ?? '').trim()
  const valLower = val.toLowerCase()
  const name = (r.name ?? '').toLowerCase()

  /* Resolve date range from preset name or encoded value (exact/before/after/range). */
  const getRangeForDateValue = (v: string, kind: 'start' | 'due') => {
    const parsed = parseDateValue(v)
    if (parsed) return parsed
    const presetRange = getDateRangeForPreset(v, kind)
    if (presetRange) return { ...presetRange, mode: 'exact' as const }
    return null
  }

  /* Task name filter: map to reminder name */
  if (c.field === 'task_name') {
    if (c.operator === 'contains') return name.includes(valLower)
    if (c.operator === 'does_not_contain') return !name.includes(valLower)
    return true
  }

  /* Due date filter: map to remind_at */
  if (c.field === 'due_date') {
    const iso = r.remind_at ? new Date(r.remind_at).getTime() : null
    if (c.operator === 'is_set') return iso != null
    if (c.operator === 'is_not_set') return iso == null
    if (valLower === 'no date' && (c.operator === 'is' || c.operator === 'is_not')) {
      return c.operator === 'is' ? iso == null : iso != null
    }
    if (valLower === 'any date' && (c.operator === 'is' || c.operator === 'is_not')) {
      return c.operator === 'is' ? iso != null : iso == null
    }
    const range = getRangeForDateValue(val, 'due')
    if (range && c.operator === 'is') {
      if (iso == null) return false
      if (range.mode === 'before') return iso < range.start
      if (range.mode === 'after') return iso > range.end
      return iso >= range.start && iso <= range.end
    }
    if (range && c.operator === 'is_not') {
      if (iso == null) return true
      if (range.mode === 'before') return iso >= range.start
      if (range.mode === 'after') return iso <= range.end
      return iso < range.start || iso > range.end
    }
    if (iso != null && range && c.operator === 'before') return iso < range.start
    if (iso != null && range && c.operator === 'after') return iso > range.end
    return true
  }

  /* Other fields don't apply to reminders, so return true (don't filter out) */
  return true
}

/**
 * Tasks page component.
 * Toolbar: view buttons (Line Up, Available, All, Custom), Filter, Sort, Search, Add. Task list with Archive/Trash at bottom.
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
    deleteReminder: deleteReminderBase,
    toggleComplete: toggleReminderComplete,
  } = useReminders()

  const { fetchTags } = useTags()
  const [availableTagNames, setAvailableTagNames] = useState<string[]>([])

  /* Wrapper to refetch reminders after create/update to ensure list stays in sync */
  const createReminder = async (input: import('../reminders/types').CreateReminderInput) => {
    const result = await createReminderBase(input)
    await refetchReminders()
    return result
  }

  const updateReminder = async (id: string, input: import('../reminders/types').UpdateReminderInput) => {
    const result = await updateReminderBase(id, input)
    await refetchReminders()
    return result
  }

  const deleteReminder = async (id: string) => {
    await deleteReminderBase(id)
    await refetchReminders()
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)

  /* View mode: lineup | available | all | custom. Available is default. */
  const [viewMode, setViewMode] = useState<'lineup' | 'available' | 'all' | 'custom'>('available')
  /* Archive/Trash: when true, list shows only archived or only deleted tasks (no filters applied). */
  const [showArchived, setShowArchived] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  /* Line Up: task IDs in the lineup (persisted in localStorage). */
  const [lineUpTaskIds, setLineUpTaskIds] = useState<Set<string>>(new Set())
  /* Search: query and whether the search pill is expanded. */
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  /* Filter and Sort modals open state. */
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  /* Custom view: filter conditions (flat list) and sort order. */
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([])
  const [sortBy, setSortBy] = useState<SortByEntry[]>([])
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<string | null>(null)
  /* Saved views list for Custom dropdown (fetch on mount). */
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [customDropdownOpen, setCustomDropdownOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')
  const [savingView, setSavingView] = useState(false)
  const [updatingView, setUpdatingView] = useState(false)
  /* Blocked/blocking task IDs: for Available view and for Custom filter (Task dependencies). */
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set())
  const [blockingTaskIds, setBlockingTaskIds] = useState<Set<string>>(new Set())

  /* Fetch saved views on mount (for Custom dropdown). */
  useEffect(() => {
    getSavedViews(null)
      .then(setSavedViews)
      .catch(() => setSavedViews([]))
  }, [])

  /* Fetch existing tag names when filter modal opens (for Tags multi-select). */
  useEffect(() => {
    if (filterOpen) {
      fetchTags()
        .then((tags) => setAvailableTagNames(tags.map((t) => t.name ?? '').filter(Boolean)))
        .catch(() => setAvailableTagNames([]))
    }
  }, [filterOpen, fetchTags])

  /* Load lineup from localStorage on mount and when key might have changed. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LINE_UP_STORAGE_KEY)
      const ids: string[] = raw ? JSON.parse(raw) : []
      setLineUpTaskIds(new Set(Array.isArray(ids) ? ids : []))
    } catch {
      setLineUpTaskIds(new Set())
    }
  }, [])

  /* Compute blocked and blocking task IDs (for Available view and Custom dependency filters). */
  useEffect(() => {
    if (tasks.length === 0) {
      setBlockedTaskIds(new Set())
      setBlockingTaskIds(new Set())
      return
    }
    const taskIds = tasks.map((t) => t.id)
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]))
    getDependenciesForTaskIds(taskIds)
      .then((deps) => {
        const blocked = new Set<string>()
        const blocking = new Set<string>()
        for (const d of deps) {
          blocking.add(d.blocker_id)
          const blocker = byId[d.blocker_id]
          if (blocker && blocker.status !== 'completed') {
            blocked.add(d.blocked_id)
          }
        }
        setBlockedTaskIds(blocked)
        setBlockingTaskIds(blocking)
      })
      .catch(() => {
        setBlockedTaskIds(new Set())
        setBlockingTaskIds(new Set())
      })
  }, [tasks])

  /* Persist lineup to localStorage when it changes. */
  const persistLineUp = useCallback((ids: Set<string>) => {
    const arr = Array.from(ids)
    try {
      localStorage.setItem(LINE_UP_STORAGE_KEY, JSON.stringify(arr))
    } catch {
      // ignore
    }
    setLineUpTaskIds(ids)
  }, [])

  const addToLineUp = useCallback(
    (id: string) => {
      setLineUpTaskIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        persistLineUp(next)
        return next
      })
    },
    [persistLineUp],
  )

  const removeFromLineUp = useCallback(
    (id: string) => {
      setLineUpTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        persistLineUp(next)
        return next
      })
    },
    [persistLineUp],
  )

  const handleLoadSavedView = useCallback((view: SavedView) => {
    setFilterConditions((view.filter_json as FilterCondition[]) ?? [])
    setSortBy((view.sort_json as SortByEntry[]) ?? [])
    setSelectedSavedViewId(view.id)
    setViewMode('custom')
    setCustomDropdownOpen(false)
  }, [])

  const handleSaveCurrentView = useCallback(async () => {
    const name = saveViewName.trim() || 'Untitled view'
    setSavingView(true)
    try {
      const created = await createSavedView({
        user_id: null,
        name,
        filter_json: filterConditions,
        sort_json: sortBy,
      })
      setSavedViews((prev) => [created, ...prev])
      setSaveViewName('')
      setSelectedSavedViewId(created.id)
      setCustomDropdownOpen(false)
    } catch {
      // leave dropdown open
    } finally {
      setSavingView(false)
    }
  }, [saveViewName, filterConditions, sortBy])

  /* Check if current filters/sorts differ from selected saved view: Used to show update button */
  const hasViewChanges = useMemo(() => {
    if (!selectedSavedViewId) return false
    const selectedView = savedViews.find(v => v.id === selectedSavedViewId)
    if (!selectedView) return false
    
    /* Compare filters: Deep equality check */
    const savedFilters = (selectedView.filter_json as FilterCondition[]) ?? []
    const filtersMatch = JSON.stringify(savedFilters.sort((a, b) => a.id.localeCompare(b.id))) === 
                         JSON.stringify(filterConditions.sort((a, b) => a.id.localeCompare(b.id)))
    
    /* Compare sorts: Deep equality check */
    const savedSorts = (selectedView.sort_json as SortByEntry[]) ?? []
    const sortsMatch = JSON.stringify(savedSorts) === JSON.stringify(sortBy)
    
    return !filtersMatch || !sortsMatch
  }, [selectedSavedViewId, savedViews, filterConditions, sortBy])

  /* Update current saved view: Save current filter and sort settings to selected view */
  const handleUpdateCurrentView = useCallback(async () => {
    if (!selectedSavedViewId) return
    
    setUpdatingView(true)
    try {
      const updated = await updateSavedView(selectedSavedViewId, {
        filter_json: filterConditions,
        sort_json: sortBy,
      })
      /* Update the saved view in the list */
      setSavedViews((prev) => prev.map(v => v.id === updated.id ? updated : v))
    } catch {
      // Error already logged in updateSavedView
    } finally {
      setUpdatingView(false)
    }
  }, [selectedSavedViewId, filterConditions, sortBy])

  /* Delete saved view: Remove from database and update state */
  const handleDeleteSavedView = useCallback(async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this saved view?')) return
    
    try {
      await deleteSavedView(viewId)
      /* Remove from saved views list */
      setSavedViews((prev) => prev.filter(v => v.id !== viewId))
      /* If this was the selected view, clear selection */
      if (selectedSavedViewId === viewId) {
        setSelectedSavedViewId(null)
      }
    } catch {
      // Error already logged in deleteSavedView
    }
  }, [selectedSavedViewId])

  /* Filter pipeline: Archive/Trash first, then by view, then by filter (custom), then by search, then by sort. */
  const { filteredTasks, filteredReminders } = useMemo(() => {
    /* Reminders: hide soft-deleted by default; include completed unless filtered by view. */
    let remindersFiltered = reminders.filter((r) => {
      if (r.deleted ?? false) return false
      return true
    })

    /* Archive/Trash: show only archived or only deleted; no filter/sort applied. */
    if (showArchived) {
      const list = tasks.filter((t) => t.status === 'archived')
      return {
        filteredTasks: list,
        filteredReminders: [], // Archive view shows only archived tasks, no reminders
      }
    }
    if (showDeleted) {
      const list = tasks.filter((t) => t.status === 'deleted')
      return {
        filteredTasks: list,
        filteredReminders: [], // Trash view shows only deleted tasks, no reminders
      }
    }

    /* Base tasks: include all statuses; Archive/Trash views filter by status explicitly below. */
    let baseTasks = tasks

    /* By view: lineup, available, all, or custom base list. */
    let viewTasks: Task[]
    switch (viewMode) {
      case 'lineup':
        viewTasks = baseTasks.filter((t) => lineUpTaskIds.has(t.id))
        /* Line Up shows only tasks in the lineup; no reminders */
        remindersFiltered = []
        break
      case 'available': {
        /* Available view: apply built-in default filter (status not Complete, no blocking deps, start <= now & earlier) via filter conditions. */
        const conditions = AVAILABLE_DEFAULT_FILTER_CONDITIONS
        viewTasks = baseTasks.filter((t) => {
          if (t.status === 'archived' || t.status === 'deleted') return false
          let result = false
          for (let i = 0; i < conditions.length; i++) {
            const c = conditions[i]
            const match = evaluateFilterCondition(c, t, blockedTaskIds, blockingTaskIds)
            const combine = i === 0 ? undefined : (c.combineWithPrevious ?? 'and')
            if (i === 0) result = match
            else result = combine === 'or' ? result || match : result && match
          }
          return result
        })
        /* Sort Available: urgent first, then due date (earliest), priority (high to low), status (in progress before open). */
        viewTasks = [...viewTasks].sort((a, b) => {
          const aUrgent = a.priority === 'urgent' ? 1 : 0
          const bUrgent = b.priority === 'urgent' ? 1 : 0
          if (bUrgent !== aUrgent) return bUrgent - aUrgent
          const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
          const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
          if (aDue !== bDue) return aDue - bDue
          const aPri = PRIORITY_ORDER[a.priority] ?? 0
          const bPri = PRIORITY_ORDER[b.priority] ?? 0
          if (bPri !== aPri) return bPri - aPri
          const statusOrder = (s: Task['status']) => (s === 'in_progress' ? 1 : s === 'active' ? 0 : -1)
          return statusOrder(b.status) - statusOrder(a.status)
        })
        /* Available view: show only incomplete reminders (align with "status is not complete"). */
        remindersFiltered = remindersFiltered.filter((r) => !r.completed)
        break
      }
      case 'all': {
        /* All Tasks view: default filter is Status is not Complete. */
        const conditions = ALL_DEFAULT_FILTER_CONDITIONS
        viewTasks = baseTasks.filter((t) => {
          let result = false
          for (let i = 0; i < conditions.length; i++) {
            const c = conditions[i]
            const match = evaluateFilterCondition(c, t, blockedTaskIds, blockingTaskIds)
            const combine = i === 0 ? undefined : (c.combineWithPrevious ?? 'and')
            if (i === 0) result = match
            else result = combine === 'or' ? result || match : result && match
          }
          return result
        })
        /* All Tasks view: show only incomplete reminders (align with "status is not complete"). */
        remindersFiltered = remindersFiltered.filter((r) => !r.completed)
        break
      }
      case 'custom':
      default:
        viewTasks = [...baseTasks]
        /* Apply filter conditions with AND/OR: left-to-right evaluation using each condition's combineWithPrevious (default 'and'). */
        if (filterConditions.length > 0) {
          viewTasks = viewTasks.filter((t) => {
            let result = false
            for (let i = 0; i < filterConditions.length; i++) {
              const c = filterConditions[i]
              const match = evaluateFilterCondition(c, t, blockedTaskIds, blockingTaskIds)
              const combine = i === 0 ? undefined : (c.combineWithPrevious ?? 'and')
              if (i === 0) result = match
              else result = combine === 'or' ? result || match : result && match
            }
            return result
          })
          /* Apply filter conditions to reminders: only due_date and task_name fields apply */
          const reminderRelevantConditions = filterConditions.filter(
            (c) => c.field === 'due_date' || c.field === 'task_name',
          )
          if (reminderRelevantConditions.length > 0) {
            remindersFiltered = remindersFiltered.filter((r) => {
              let result = false
              for (let i = 0; i < reminderRelevantConditions.length; i++) {
                const c = reminderRelevantConditions[i]
                const match = evaluateFilterConditionForReminder(c, r)
                const combine = i === 0 ? undefined : (c.combineWithPrevious ?? 'and')
                if (i === 0) result = match
                else result = combine === 'or' ? result || match : result && match
              }
              return result
            })
          }
        }
        /* Apply user sort when in custom and sortBy has entries. */
        if (sortBy.length > 0) {
          viewTasks.sort((a, b) => {
            for (const { field, direction } of sortBy) {
              let cmp = 0
              if (field === 'due_date') {
                const av = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
                const bv = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
                cmp = av - bv
              } else if (field === 'start_date') {
                const av = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER
                const bv = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER
                cmp = av - bv
              } else if (field === 'priority') {
                cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0)
              } else if (field === 'status') {
                const so: Record<Task['status'], number> = {
                  active: 0,
                  in_progress: 1,
                  completed: 2,
                  archived: 3,
                  deleted: 4,
                }
                cmp = (so[a.status] ?? 0) - (so[b.status] ?? 0)
              } else if (field === 'task_name') {
                cmp = (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' })
              } else if (field === 'time_estimate') {
                const av = a.time_estimate ?? 0
                const bv = b.time_estimate ?? 0
                cmp = av - bv
              }
              if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
            }
            return 0
          })
          /* Apply sort to reminders: only due_date and task_name fields apply */
          remindersFiltered.sort((a, b) => {
            for (const { field, direction } of sortBy) {
              /* Only apply sorts for fields that make sense for reminders */
              if (field !== 'due_date' && field !== 'task_name') continue
              let cmp = 0
              if (field === 'due_date') {
                const av = a.remind_at ? new Date(a.remind_at).getTime() : Number.MAX_SAFE_INTEGER
                const bv = b.remind_at ? new Date(b.remind_at).getTime() : Number.MAX_SAFE_INTEGER
                cmp = av - bv
              } else if (field === 'task_name') {
                cmp = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })
              }
              if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
            }
            return 0
          })
        }
        break
    }

    /* By search: client-side match on task title/description and reminder name. */
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      viewTasks = viewTasks.filter(
        (t) =>
          (t.title ?? '').toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      )
      // Reminders are not filtered by search in plan for now; optionally filter:
      // remindersFiltered = remindersFiltered.filter((r) => (r.name ?? '').toLowerCase().includes(q))
    }

    return {
      filteredTasks: viewTasks,
      filteredReminders: remindersFiltered,
    }
  }, [
    tasks,
    reminders,
    showArchived,
    showDeleted,
    viewMode,
    lineUpTaskIds,
    blockedTaskIds,
    blockingTaskIds,
    filterConditions,
    sortBy,
    searchQuery,
  ])

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
      {/* Row 1: Page title only */}
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-4">Tasks</h1>

      {/* Row 2: Toolbar — left = view buttons, right = Filter, Sort, Search, Add */}
      <div className="flex flex-wrap items-center gap-2 justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setViewMode('lineup')
              setSelectedSavedViewId(null)
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-secondary font-medium transition-colors ${viewMode === 'lineup' ? 'bg-bonsai-sage-200 text-bonsai-sage-800' : 'bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200'}`}
            aria-pressed={viewMode === 'lineup'}
          >
            <LineUpIcon className="w-4 h-4 md:w-5 md:h-5" />
            Line Up
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('available')
              setSelectedSavedViewId(null)
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-secondary font-medium transition-colors ${viewMode === 'available' ? 'bg-bonsai-sage-200 text-bonsai-sage-800' : 'bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200'}`}
            aria-pressed={viewMode === 'available'}
          >
            <ListIcon className="w-4 h-4 md:w-5 md:h-5" />
            Available
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('all')
              setSelectedSavedViewId(null)
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-secondary font-medium transition-colors ${viewMode === 'all' ? 'bg-bonsai-sage-200 text-bonsai-sage-800' : 'bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200'}`}
            aria-pressed={viewMode === 'all'}
          >
            <InfinityIcon className="w-4 h-4 md:w-5 md:h-5" />
            All Tasks
          </button>
          {/* Custom: button with dropdown for save/load saved views */}
          <div className="relative inline-block">
            {(() => {
              /* Get selected view name: Find view by ID or use "Custom" as default */
              const selectedView = selectedSavedViewId 
                ? savedViews.find(v => v.id === selectedSavedViewId)
                : null
              const buttonText = selectedView?.name || 'Custom'
              
              return (
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('custom')
                    setCustomDropdownOpen((v) => !v)
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-secondary font-medium transition-colors ${viewMode === 'custom' ? 'bg-bonsai-sage-200 text-bonsai-sage-800' : 'bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200'}`}
                  aria-pressed={viewMode === 'custom'}
                  aria-haspopup="true"
                  aria-expanded={customDropdownOpen}
                >
                  {buttonText}
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              )
            })()}
            {customDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setCustomDropdownOpen(false)}
                />
                <div 
                  className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-bonsai-slate-200 bg-white py-2 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Saved views list: Show at top */}
                  {savedViews.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border-b border-bonsai-slate-100">
                      {savedViews.map((v) => (
                        <div
                          key={v.id}
                          className="group flex items-center gap-2 px-3 py-2 hover:bg-bonsai-slate-100"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLoadSavedView(v)
                            }}
                            className="flex-1 text-left text-body text-bonsai-slate-700"
                          >
                            {v.name}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedView(v.id, e)}
                            className="shrink-0 p-1 rounded text-bonsai-slate-400 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Delete ${v.name}`}
                          >
                            <CloseIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Save new view: Input and button side by side */}
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={saveViewName}
                        onChange={(e) => setSaveViewName(e.target.value)}
                        placeholder="Name for new view"
                        className="flex-1 rounded border border-bonsai-slate-300 px-2 py-1.5 text-body text-bonsai-slate-700"
                        aria-label="View name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !savingView) {
                            e.stopPropagation()
                            handleSaveCurrentView()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveCurrentView()
                        }}
                        disabled={savingView}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-body font-medium text-bonsai-sage-700 bg-bonsai-sage-100 hover:bg-bonsai-sage-200 disabled:opacity-50 whitespace-nowrap"
                      >
                        {savingView ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {searchExpanded ? (
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="flex-1 rounded-full border-2 border-bonsai-sage-500 px-4 py-2 text-body bg-white focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
                aria-label="Search tasks"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSearchExpanded(false)
                }}
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200"
                aria-label="Clear search"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Save view button: Show when in custom view with no saved view selected */}
              {viewMode === 'custom' && !selectedSavedViewId && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDropdownOpen(true)
                    /* Focus the input after dropdown opens */
                    setTimeout(() => {
                      const input = document.querySelector('[aria-label="View name"]') as HTMLInputElement
                      input?.focus()
                    }, 100)
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 md:px-3 text-secondary font-medium text-bonsai-sage-700 bg-bonsai-sage-100 hover:bg-bonsai-sage-200 transition-colors whitespace-nowrap"
                  aria-label="Save view"
                >
                  Save view
                </button>
              )}
              {/* Update current view button: Show when a saved view is selected and has been modified */}
              {selectedSavedViewId && hasViewChanges && (
                <button
                  type="button"
                  onClick={handleUpdateCurrentView}
                  disabled={updatingView}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 md:px-3 text-secondary font-medium text-bonsai-sage-700 bg-bonsai-sage-100 hover:bg-bonsai-sage-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                  aria-label="Update current view"
                >
                  {updatingView ? 'Updating…' : 'Update current view'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200 transition-colors"
                aria-label="Filter tasks"
                aria-expanded={filterOpen}
              >
                <FilterIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={() => setSortOpen(true)}
                className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200 transition-colors"
                aria-label="Sort tasks"
                aria-expanded={sortOpen}
              >
                <SortIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200 transition-colors"
                aria-label="Search tasks"
              >
                <SearchIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </>
          )}
          <AddButton
            className="self-end sm:self-auto"
            aria-label="Add new task"
            dropdownContent={<AddTaskDropdownContent onAddReminder={openAddReminder} />}
            onClick={openAdd}
          >
            Add new task
          </AddButton>
        </div>
      </div>

      {/* Filter modal: show effective filter (Available default or Custom conditions) so user sees what is selected */}
      <FilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        conditions={
          viewMode === 'available'
            ? AVAILABLE_DEFAULT_FILTER_CONDITIONS
            : viewMode === 'all'
              ? ALL_DEFAULT_FILTER_CONDITIONS
              : filterConditions
        }
        onConditionsChange={(newConditions) => {
          // If switching from available/all to custom and no custom filters exist yet, preserve defaults
          const wasAvailable = viewMode === 'available'
          const wasAll = viewMode === 'all'
          if ((wasAvailable || wasAll) && filterConditions.length === 0 && newConditions.length > 0) {
            // User modified filters from available/all view - use their modifications
            setFilterConditions(newConditions)
          } else {
            setFilterConditions(newConditions)
          }
          // Keep selectedSavedViewId so user can update the view if desired
          // Switch to custom mode immediately when user modifies filters
          if (viewMode !== 'custom') {
            setViewMode('custom')
          }
        }}
        onApply={() => setViewMode('custom')}
        availableTagNames={availableTagNames}
      />

      {/* Sort modal: show effective sort (Available default or Custom sortBy) so user sees what is selected */}
      <SortModal
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        sortBy={viewMode === 'available' ? AVAILABLE_DEFAULT_SORT : sortBy}
        onSortByChange={(newSortBy) => {
          setSortBy(newSortBy)
          // Keep selectedSavedViewId so user can update the view if desired
          // Switch to custom mode immediately when user modifies sort
          // If switching from available and no custom filters exist yet, copy the available defaults
          if (viewMode === 'available' && filterConditions.length === 0) {
            setFilterConditions([...AVAILABLE_DEFAULT_FILTER_CONDITIONS])
          }
          if (viewMode !== 'custom') {
            setViewMode('custom')
          }
        }}
        onApply={() => setViewMode('custom')}
        defaultSortLabel={viewMode === 'all' && sortBy.length === 0 ? 'Default order (newest first)' : undefined}
      />

      {/* Task list: tasks and reminders; Archive/Trash at bottom rendered inside TaskList */}
      <TaskList
        tasks={filteredTasks}
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
        onCreateTask={createTask}
        onArchiveTask={async (task) => {
          /* Archive/Unarchive: If task is archived, unarchive it (set to active); otherwise archive it */
          if (task.status === 'archived') {
            await updateTask(task.id, { status: 'active' })
          } else {
            await updateTask(task.id, { status: 'archived' })
          }
        }}
        onMarkDeletedTask={async (task) => {
          await updateTask(task.id, { status: 'deleted' })
        }}
        reminders={filteredReminders}
        remindersLoading={remindersLoading}
        remindersError={remindersError}
        onToggleReminderComplete={toggleReminderComplete}
        onEditReminder={openEditReminder}
        onUpdateReminder={updateReminder}
        onCreateReminder={createReminder}
        onMarkDeletedReminder={async (reminder) => {
          await updateReminder(reminder.id, { deleted: true })
        }}
        onDeleteReminder={deleteReminder}
        onShowArchived={() => {
          setShowArchived(true)
          setShowDeleted(false)
        }}
        onShowDeleted={() => {
          setShowDeleted(true)
          setShowArchived(false)
        }}
        showArchived={showArchived}
        showDeleted={showDeleted}
        onClearArchiveTrashView={() => {
          setShowArchived(false)
          setShowDeleted(false)
        }}
        lineUpTaskIds={lineUpTaskIds}
        onAddToLineUp={addToLineUp}
        onRemoveFromLineUp={removeFromLineUp}
      />

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
