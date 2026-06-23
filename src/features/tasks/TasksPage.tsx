/* Tasks page: Section header, view toolbar (Today's Lineup / Available / All / Custom), Filter/Sort/Search, task list, Archive/Trash at bottom, Add/Edit modals */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { consumeQuickAddIntent } from '../layout/quickAddIntent'
import { peekSearchOpenIntent, clearSearchOpenIntent } from '../search/searchOpenIntent'
import { AddEditTaskModal } from './AddEditTaskModal'
import { TaskList } from './TaskList'
import { TasksBonsaiView } from './components/bonsai/TasksBonsaiView'
import { DeletedTasksView } from './components/bonsai/DeletedTasksView'
import { buildHabitReminderRows } from '../habits/utils/habitReminderRows'
import { partitionBonsaiSections, sortOtherTasksBacklog } from './utils/partitionBonsaiTasks'
import {
  getBonsaiSearchableTaskPool,
  matchesTaskNameSearch,
} from './utils/taskSearch'
import { computeBlockedTaskIds, computeBlockingTaskIds } from './utils/dependencies'
import { useTasks } from './hooks/useTasks'
import { useTodaysLineup } from './hooks/useTodaysLineup'
import { useHabits } from '../habits/hooks/useHabits'
import { getDependenciesForTaskIds } from '../../lib/supabase/tasks'
import { useTags } from './hooks/useTags'
import { FilterModal } from './modals/FilterModal'
import type { Task } from './types'
import type { SortByEntry } from './types'
import type { FilterRoot } from './types/filter'
import { emptyFilterRoot } from './types/filter'
import {
  ALL_DEFAULT_FILTER_ROOT,
  AVAILABLE_DEFAULT_FILTER_ROOT,
  MODAL_DEFAULT_FILTER_ROOT,
} from './utils/filterMigration'
import {
  evaluateFlatConditionsForReminder,
  flattenConditionLeaves,
  isFilterRootActive,
  matchesFilterRoot,
  type ScheduleLikeRow,
} from './utils/filterEvaluation'
import {
  buildFilterSummaryChips,
  removeConditionFromRoot,
} from './utils/filterSummary'
import { habitReminderEffectiveInstant, taskDateToComparableMs } from './utils/date'
import { useUserTimeZone } from '../settings/useUserTimeZone'

/** Priority order for sort: higher index = higher priority (urgent last so it sorts first when desc) */
const PRIORITY_ORDER: Record<Task['priority'], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

/** Available view default sort (for display in Sort modal when in Available view): due date, priority, status */
const AVAILABLE_DEFAULT_SORT: SortByEntry[] = [
  { field: 'due_date', direction: 'asc' },
  { field: 'priority', direction: 'desc' },
  { field: 'status', direction: 'asc' },
]

/* All Tasks view default sort (for internal use and Sort modal semantics): due date then start date, earliest first with no date last */
const ALL_DEFAULT_SORT: SortByEntry[] = [
  { field: 'due_date', direction: 'asc' },
  { field: 'start_date', direction: 'asc' },
]

/* Shared helper: apply sortBy configuration to a task list (used by All and Custom views). */
function sortTasksWithSortBy(tasks: Task[], sortBy: SortByEntry[], timeZone: string): Task[] {
  return [...tasks].sort((a, b) => {
    for (const { field, direction } of sortBy) {
      let cmp = 0
      if (field === 'due_date') {
        /* Due sort: treat date-only due as local-day boundary to avoid UTC day shifts. */
        const av = taskDateToComparableMs(a.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
        const bv = taskDateToComparableMs(b.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
        cmp = av - bv
      } else if (field === 'start_date') {
        /* Start sort: treat date-only starts as local-day boundary to avoid UTC day shifts. */
        const av = taskDateToComparableMs(a.start_date, timeZone) ?? Number.MAX_SAFE_INTEGER
        const bv = taskDateToComparableMs(b.start_date, timeZone) ?? Number.MAX_SAFE_INTEGER
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
}


/* Sort habit rows by the same fields as tasks (due/start → task due; task_name → linked task title). */
function sortHabitReminderItemsWithSortBy(
  items: ReturnType<typeof buildHabitReminderRows>,
  sortBy: SortByEntry[],
  timeZone: string,
): ReturnType<typeof buildHabitReminderRows> {
  return [...items].sort((a, b) => {
    const aIso =
      a.task.due_date ??
      habitReminderEffectiveInstant(a.remindAt, a.habit.reminder_time ?? null, timeZone) ??
      a.remindAt ??
      ''
    const bIso =
      b.task.due_date ??
      habitReminderEffectiveInstant(b.remindAt, b.habit.reminder_time ?? null, timeZone) ??
      b.remindAt ??
      ''
    for (const { field, direction } of sortBy) {
      if (field !== 'start_date' && field !== 'due_date' && field !== 'task_name') continue
      let cmp = 0
      if (field === 'start_date' || field === 'due_date') {
        const av = aIso ? new Date(aIso as string).getTime() : Number.MAX_SAFE_INTEGER
        const bv = bIso ? new Date(bIso as string).getTime() : Number.MAX_SAFE_INTEGER
        cmp = av - bv
      } else if (field === 'task_name') {
        cmp = (a.task.title ?? '').localeCompare(b.task.title ?? '', undefined, { sensitivity: 'base' })
      }
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

/**
 * Tasks page component.
 * Toolbar: view buttons (Today's Lineup, Available, All, Custom), Filter, Sort, Search, Add. Task list with Archive/Trash at bottom.
 */
export function TasksPage() {
  /* Same zone as Settings / task dates — habit reminder availability uses wall time + occurrence */
  const timeZone = useUserTimeZone()
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

  /* Habits: joined to tasks for available-view filtering (reminders live in notification bell). */
  const { habitsWithStreaks, refetch: refetchHabits } = useHabits()

  /* Refetch habits when Tasks page becomes visible so recurring habit reminders stay in sync (e.g. after adding habit or switching tabs) */
  useEffect(() => {
    const onVisible = () => {
      refetchHabits()
    }
    if (document.visibilityState === 'visible') onVisible()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetchHabits])

  const {
    fetchTags,
    searchTags,
    createTag,
    updateTag,
    deleteTagFromAllTasks,
    setTagsForTask: setTagIdsForTask,
  } = useTags()
  const [availableTagNames, setAvailableTagNames] = useState<string[]>([])

  /* Tag save wrapper: Bonsai rows pass Tag[]; data layer expects tag ids */
  const setTagsForTask = useCallback(
    async (taskId: string, tags: import('./types').Tag[]) => {
      await setTagIdsForTask(
        taskId,
        tags.map((t) => t.id),
      )
      await refetch()
    },
    [setTagIdsForTask, refetch],
  )

  /* Habit rows: used by legacy TaskList paths and available-view habit filtering */
  const habitReminders = useMemo(
    () => buildHabitReminderRows(tasks, habitsWithStreaks),
    [tasks, habitsWithStreaks],
  )

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  /* Bump when tasks/checklists change outside list refetch (e.g. edit modal close). */
  const [enrichmentRefreshKey, setEnrichmentRefreshKey] = useState(0)
 
  /* View mode: backlog pool filter (available | all | custom). Lineup is always a separate section. */
  const [viewMode, setViewMode] = useState<'available' | 'all' | 'custom'>('available')
  /* Archive/Trash: when true, list shows only archived or only deleted tasks (no filters applied). */
  const [showArchived, setShowArchived] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  /* Search: query and whether the search pill is expanded. */
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  /* Filter and Sort modals open state. */
  const [filterOpen, setFilterOpen] = useState(false)
  /* Applied custom filter tree (ClickUp-style nested rules). */
  const [filterRoot, setFilterRoot] = useState<FilterRoot>(() => emptyFilterRoot())
  /* Custom sort entries (reserved; Bonsai header uses available/all default sorts) */
  const sortBy: SortByEntry[] = []
  /* Blocked/blocking task IDs: for Available view and for Custom filter (Task dependencies). */
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set())
  const [blockingTaskIds, setBlockingTaskIds] = useState<Set<string>>(new Set())
  const [blockedTaskIdsResolved, setBlockedTaskIdsResolved] = useState(false)

  /* Fetch existing tag names when filter modal opens (for Tags multi-select). */
  useEffect(() => {
    if (filterOpen) {
      fetchTags()
        .then((tags) => setAvailableTagNames(tags.map((t) => t.name ?? '').filter(Boolean)))
        .catch(() => setAvailableTagNames([]))
    }
  }, [filterOpen, fetchTags])

  /* Compute blocked and blocking task IDs (for Available view and Custom dependency filters). */
  useEffect(() => {
    if (tasks.length === 0) {
      setBlockedTaskIds(new Set())
      setBlockingTaskIds(new Set())
      setBlockedTaskIdsResolved(false)
      return
    }

    let cancelled = false
    const taskIds = tasks.map((t) => t.id)
    const taskLookup = Object.fromEntries(tasks.map((t) => [t.id, t]))
    getDependenciesForTaskIds(taskIds)
      .then((deps) => {
        if (cancelled) return
        setBlockedTaskIds(computeBlockedTaskIds(deps, taskLookup))
        setBlockingTaskIds(computeBlockingTaskIds(deps, taskLookup))
        setBlockedTaskIdsResolved(true)
      })
      .catch(() => {
        if (cancelled) return
        setBlockedTaskIds(new Set())
        setBlockingTaskIds(new Set())
        setBlockedTaskIdsResolved(true)
      })

    return () => {
      cancelled = true
    }
  }, [tasks])

  /* Today's Lineup: shared persistence + daily seed with Briefing plan step */
  const { lineUpTaskIds, lineupExcludedTaskIds, addToLineUp, removeFromLineUp } = useTodaysLineup({
    tasks,
    blockedTaskIds,
    blockedTaskIdsResolved,
    timeZone,
  })

  const filterCtx = useMemo(
    () => ({
      blockedIds: blockedTaskIds,
      blockingIds: blockingTaskIds,
      timeZone,
    }),
    [blockedTaskIds, blockingTaskIds, timeZone],
  )

  const filterModalRoot = useMemo((): FilterRoot => {
    if (!isFilterRootActive(filterRoot)) {
      return MODAL_DEFAULT_FILTER_ROOT
    }
    return filterRoot
  }, [filterRoot])

  /* Filter pipeline: Archive/Trash first, then by view, then by filter (custom), then by search, then by sort. */
  const { filteredTasks, availableTaskIds } = useMemo(() => {
    /* Habit reminders filtered by view and (for available/custom) by start/due date; set in each view branch. */
    let habitRemindersFiltered: typeof habitReminders = habitReminders

    /* Archive/Trash: show only archived or only deleted; no filter/sort applied. */
    if (showArchived) {
      const list = tasks.filter((t) => t.status === 'archived')
      return {
        filteredTasks: list,
        availableTaskIds: new Set<string>(),
      }
    }
    if (showDeleted) {
      const list = tasks.filter((t) => t.status === 'deleted')
      return {
        filteredTasks: list,
        availableTaskIds: new Set<string>(),
      }
    }

    /* Base tasks: exclude deleted and habit-linked rows (habit-linked render as habit rows).
     * Also hide subtasks whose parent is in Archive/Trash so "orphaned" active subtasks don't leak into normal views.
     */
    const taskById = new Map(tasks.map((t) => [t.id, t] as const))
    let baseTasks = tasks.filter((t) => {
      if (t.status === 'deleted') return false
      if (t.habit_id) return false
      if (t.parent_id) {
        const parent = taskById.get(t.parent_id)
        if (parent?.status === 'deleted' || parent?.status === 'archived') return false
      }
      return true
    })

    /* By view: available, all, or custom base list (backlog pool; lineup is partitioned separately). */
    let viewTasks: Task[]
    switch (viewMode) {
      case 'available': {
        /* Available view: built-in default filter root */
        viewTasks = baseTasks.filter((t) => {
          if (t.status === 'archived' || t.status === 'deleted') return false
          return matchesFilterRoot(AVAILABLE_DEFAULT_FILTER_ROOT, t, filterCtx)
        })
        /* Sort Available: urgent first, then due date (earliest), priority (high to low), status (in progress before open). */
        viewTasks = [...viewTasks].sort((a, b) => {
          const aUrgent = a.priority === 'urgent' ? 1 : 0
          const bUrgent = b.priority === 'urgent' ? 1 : 0
          if (bUrgent !== aUrgent) return bUrgent - aUrgent
          /* Due sort: treat date-only due as local-day boundary to avoid 8pm "previous day" shifts. */
          const aDue = taskDateToComparableMs(a.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
          const bDue = taskDateToComparableMs(b.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
          if (aDue !== bDue) return aDue - bDue
          const aPri = PRIORITY_ORDER[a.priority] ?? 0
          const bPri = PRIORITY_ORDER[b.priority] ?? 0
          if (bPri !== aPri) return bPri - aPri
          const statusOrder = (s: Task['status']) => (s === 'in_progress' ? 1 : s === 'active' ? 0 : -1)
          return statusOrder(b.status) - statusOrder(a.status)
        })
        /* Available view: habit rows only when effective start/due instant is now or earlier (matches task "Now & earlier" on start). */
        const nowMs = Date.now()
        habitRemindersFiltered = habitReminders.filter(({ habit, task, remindAt }) => {
          const due = task.due_date ?? remindAt
          if (due == null) return true
          const effectiveIso = habitReminderEffectiveInstant(
            due,
            habit.reminder_time ?? null,
            timeZone,
          )
          const ms = effectiveIso != null ? new Date(effectiveIso).getTime() : new Date(due).getTime()
          return ms <= nowMs
        })
        break
      }
      case 'all': {
        viewTasks = baseTasks.filter((t) =>
          matchesFilterRoot(ALL_DEFAULT_FILTER_ROOT, t, filterCtx),
        )
        habitRemindersFiltered = habitReminders
        /* All Tasks view sort: use user-defined sort when present, otherwise fall back to All default sort (due date then start date) so behavior matches Sort modal semantics */
        {
          const effectiveSortBy = sortBy.length > 0 ? sortBy : ALL_DEFAULT_SORT
          viewTasks = sortTasksWithSortBy(viewTasks, effectiveSortBy, timeZone)
          habitRemindersFiltered = sortHabitReminderItemsWithSortBy(
            habitRemindersFiltered,
            effectiveSortBy,
            timeZone,
          )
        }
        break
      }
      case 'custom':
      default:
        viewTasks = baseTasks.filter((t) => matchesFilterRoot(filterRoot, t, filterCtx))
        const reminderRelevantConditions = flattenConditionLeaves(filterRoot).filter(
          (c) => c.field === 'start_date' || c.field === 'due_date' || c.field === 'task_name',
        )
        if (reminderRelevantConditions.length > 0) {
          habitRemindersFiltered = habitReminders.filter(({ habit, task, remindAt }) => {
            const effectiveRemindAt =
              habitReminderEffectiveInstant(
                task.due_date ?? remindAt,
                habit.reminder_time ?? null,
                timeZone,
              ) ??
              task.due_date ??
              remindAt
            const syntheticRow: ScheduleLikeRow = {
              name: task.title,
              remind_at: effectiveRemindAt,
            }
            return evaluateFlatConditionsForReminder(reminderRelevantConditions, syntheticRow)
          })
        }
        /* Apply user sort when in custom and sortBy has entries (shared helper for consistency with All view). */
        if (sortBy.length > 0) {
          viewTasks = sortTasksWithSortBy(viewTasks, sortBy, timeZone)
          habitRemindersFiltered = sortHabitReminderItemsWithSortBy(habitRemindersFiltered, sortBy, timeZone)
        }
        break
    }

    /* Available task IDs: tasks that can be worked on (same logic as Available view); used for subtask expand/separate behavior */
    const availableTaskIds = new Set(
      viewTasks
        .filter((t) => {
          if (t.status === 'archived' || t.status === 'deleted') return false
          return matchesFilterRoot(AVAILABLE_DEFAULT_FILTER_ROOT, t, filterCtx)
        })
        .map((t) => t.id),
    )

    /* By search: client-side match on task title/description and habit name. */
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      viewTasks = viewTasks.filter(
        (t) =>
          (t.title ?? '').toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      )
      habitRemindersFiltered = habitRemindersFiltered.filter(
        ({ habit, task }) =>
          (habit.name ?? '').toLowerCase().includes(q) ||
          (task.title ?? '').toLowerCase().includes(q),
      )
    }

    void habitRemindersFiltered

    return {
      filteredTasks: viewTasks,
      availableTaskIds,
    }
  }, [
    tasks,
    habitReminders,
    timeZone,
    showArchived,
    showDeleted,
    viewMode,
    lineUpTaskIds,
    blockedTaskIds,
    blockingTaskIds,
    filterRoot,
    filterCtx,
    sortBy,
    searchQuery,
  ])

  /* Effective sort for the current view: used by TaskList to interleave tasks and habit reminders */
  const effectiveSortByForList: SortByEntry[] = useMemo(() => {
    if (viewMode === 'all') {
      return sortBy.length > 0 ? sortBy : ALL_DEFAULT_SORT
    }
    if (viewMode === 'custom') {
      return sortBy
    }
    if (viewMode === 'available') {
      return AVAILABLE_DEFAULT_SORT
    }
    return []
  }, [viewMode, sortBy])

  const openAdd = () => {
    setEditTask(null)
    setIsModalOpen(true)
  }

  /* Mobile quick add: open add-task modal when navigated from nav */
  useEffect(() => {
    if (consumeQuickAddIntent() === 'task') openAdd()
  }, [])

  const openEdit = (task: Task) => {
    setEditTask(task)
    setIsModalOpen(true)
  }

  /* Global search: open task edit modal when navigated from search result */
  useEffect(() => {
    const intent = peekSearchOpenIntent()
    if (intent?.kind !== 'task') return
    const task = tasks.find((t) => t.id === intent.id)
    if (!task) return

    clearSearchOpenIntent()
    const frame = requestAnimationFrame(() => {
      openEdit(task)
    })
    return () => cancelAnimationFrame(frame)
  }, [tasks])

  const closeModal = () => {
    setIsModalOpen(false)
    setEditTask(null)
  }

  /** Refetch tasks and row enrichment (checklist counts, subtasks, deps). */
  const refetchTasksAndEnrichment = useCallback(async () => {
    await refetch()
    setEnrichmentRefreshKey((k) => k + 1)
  }, [refetch])

  const bonsaiHideCompletedSubtasks = true

  const isBonsaiFilteredMode = isFilterRootActive(filterRoot)
  const isBonsaiSearchMode = searchQuery.trim().length > 0

  /* Bonsai sections: lineup (due today OR available + medium+) vs other (All Tasks sort, minus lineup) */
  const bonsaiSections = useMemo(() => {
    if (showArchived || showDeleted) {
      return {
        lineupTasks: [] as Task[],
        backlogPool: [] as Task[],
      }
    }
    const { lineupTasks, backlogPool } = partitionBonsaiSections(
      tasks,
      blockedTaskIds,
      timeZone,
      /* Search uses a dedicated results view; do not narrow lineup/backlog while typing */
      isBonsaiSearchMode ? '' : searchQuery,
      lineUpTaskIds,
      lineupExcludedTaskIds,
    )
    return { lineupTasks, backlogPool }
  }, [
    tasks,
    blockedTaskIds,
    timeZone,
    searchQuery,
    isBonsaiSearchMode,
    showArchived,
    showDeleted,
    lineUpTaskIds,
    lineupExcludedTaskIds,
  ])

  const filterSummaryChips = useMemo(
    () => buildFilterSummaryChips(filterRoot),
    [filterRoot],
  )

  /* Bonsai search results: name match on searchable pool; optional active filters narrow the pool */
  const bonsaiSearchTasks = useMemo(() => {
    if (!isBonsaiSearchMode) return []
    let pool = getBonsaiSearchableTaskPool(tasks)
    if (isBonsaiFilteredMode) {
      pool = pool.filter((t) => matchesFilterRoot(filterRoot, t, filterCtx))
    }
    pool = pool.filter((t) => matchesTaskNameSearch(t, searchQuery))
    return sortOtherTasksBacklog(pool, timeZone)
  }, [tasks, filterRoot, filterCtx, searchQuery, timeZone, isBonsaiSearchMode, isBonsaiFilteredMode])

  /* Bonsai filtered results: full pool → tree match → backlog sort (search uses dedicated view) */
  const bonsaiFilteredTasks = useMemo(() => {
    if (!isBonsaiFilteredMode || isBonsaiSearchMode) return []
    let pool = getBonsaiSearchableTaskPool(tasks)
    pool = pool.filter((t) => matchesFilterRoot(filterRoot, t, filterCtx))
    return sortOtherTasksBacklog(pool, timeZone)
  }, [tasks, filterRoot, filterCtx, timeZone, isBonsaiFilteredMode, isBonsaiSearchMode])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchExpanded(false)
  }, [])

  const handleRemoveFilterChip = useCallback((conditionId: string) => {
    setFilterRoot((prev) => removeConditionFromRoot(prev, conditionId))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilterRoot(emptyFilterRoot())
    setViewMode('available')
  }, [])

  /* Deleted tasks: most recently updated first (proxy for when marked deleted) */
  const deletedTasks = useMemo(() => {
    if (!showDeleted) return []
    return tasks
      .filter((t) => t.status === 'deleted')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [tasks, showDeleted])

  const handleRestoreDeletedTask = useCallback(
    async (task: Task) => {
      await updateTask(task.id, { status: 'active' })
      await refetch()
    },
    [updateTask, refetch],
  )

  const handleEmptyDeleted = useCallback(async () => {
    const toRemove = tasks.filter((t) => t.status === 'deleted')
    await Promise.all(toRemove.map((t) => deleteTask(t.id)))
    await refetch()
  }, [tasks, deleteTask, refetch])

  const handleBackFromDeleted = useCallback(() => {
    setShowDeleted(false)
  }, [])

  return (
    <div className="min-h-full">
      {showDeleted ? (
        <DeletedTasksView
          tasks={deletedTasks}
          allTasks={tasks}
          loading={loading}
          error={error}
          onBack={handleBackFromDeleted}
          onOpenEdit={openEdit}
          onRestoreTask={handleRestoreDeletedTask}
          onEmptyDeleted={handleEmptyDeleted}
          refetch={refetch}
          fetchSubtasks={fetchSubtasks}
          getTaskDependencies={getTaskDependencies}
          createTask={createTask}
          onArchiveTask={async (task) => {
            if (task.status === 'archived') {
              await updateTask(task.id, { status: 'active' })
            } else {
              await updateTask(task.id, { status: 'archived' })
            }
            refetch()
          }}
          onMarkDeletedTask={async (task) => {
            if (task.status === 'deleted') {
              await updateTask(task.id, { status: 'active' })
            } else {
              await updateTask(task.id, { status: 'deleted' })
            }
            refetch()
          }}
          lineUpTaskIds={lineUpTaskIds}
          onAddToLineUp={addToLineUp}
          onRemoveFromLineUp={removeFromLineUp}
        />
      ) : showArchived ? (
        <>
          <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-4">Tasks</h1>
          <TaskList
            tasks={filteredTasks}
            availableTaskIds={availableTaskIds}
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
              if (task.status === 'archived') {
                await updateTask(task.id, { status: 'active' })
              } else {
                await updateTask(task.id, { status: 'archived' })
              }
            }}
            onMarkDeletedTask={async (task) => {
              if (task.status === 'deleted') {
                await updateTask(task.id, { status: 'active' })
              } else {
                await updateTask(task.id, { status: 'deleted' })
              }
            }}
            habitReminders={[]}
            hideCompletedSubtasks={false}
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
            viewMode={viewMode}
            effectiveSortBy={effectiveSortByForList}
          />
        </>
      ) : (
        <>
          <TasksBonsaiView
            tasks={tasks}
            lineupTasks={bonsaiSections.lineupTasks}
            backlogPool={bonsaiSections.backlogPool}
            blockedTaskIds={blockedTaskIds}
            filterMode={
              isBonsaiSearchMode ? 'search' : isBonsaiFilteredMode ? 'filtered' : 'default'
            }
            searchTasks={bonsaiSearchTasks}
            filteredTasks={bonsaiFilteredTasks}
            onClearSearch={handleClearSearch}
            filterSummaryChips={filterSummaryChips}
            onRemoveFilterChip={handleRemoveFilterChip}
            onClearFilters={handleClearFilters}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            searchExpanded={searchExpanded}
            onSearchQueryChange={setSearchQuery}
            onSearchExpandedChange={setSearchExpanded}
            onOpenFilter={() => setFilterOpen(true)}
            onAddTask={openAdd}
            onOpenEdit={openEdit}
            onShowDeleted={() => {
              setShowDeleted(true)
              setShowArchived(false)
            }}
            refetch={refetchTasksAndEnrichment}
            enrichmentRefreshKey={enrichmentRefreshKey}
            toggleComplete={toggleComplete}
            updateTask={updateTask}
            fetchSubtasks={fetchSubtasks}
            getTaskDependencies={getTaskDependencies}
            createTask={createTask}
            hideCompletedSubtasks={bonsaiHideCompletedSubtasks}
            lineUpTaskIds={lineUpTaskIds}
            onAddToLineUp={addToLineUp}
            onRemoveFromLineUp={removeFromLineUp}
            setTagsForTask={setTagsForTask}
            searchTags={searchTags}
            createTag={createTag}
            updateTag={updateTag}
            deleteTagFromAllTasks={deleteTagFromAllTasks}
            onArchiveTask={async (task) => {
              if (task.status === 'archived') {
                await updateTask(task.id, { status: 'active' })
              } else {
                await updateTask(task.id, { status: 'archived' })
              }
              await refetchTasksAndEnrichment()
            }}
            onMarkDeletedTask={async (task) => {
              if (task.status === 'deleted') {
                await updateTask(task.id, { status: 'active' })
              } else {
                await updateTask(task.id, { status: 'deleted' })
              }
              await refetchTasksAndEnrichment()
            }}
          />

          {/* Filter modal: tune control; backlog uses available defaults until customized */}
          <FilterModal
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
            filterRoot={filterModalRoot}
            onFilterRootChange={(root) => {
              setFilterRoot(root)
              if (viewMode !== 'custom') {
                setViewMode('custom')
              }
            }}
            onApply={() => setViewMode('custom')}
            availableTagNames={availableTagNames}
          />
        </>
      )}


      <AddEditTaskModal
        isOpen={isModalOpen}
        onClose={() => {
          closeModal()
          void refetchTasksAndEnrichment()
        }}
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
        onOpenLinkedTask={openEdit}
        onArchiveTask={async (t) => {
          /* Archive/Unarchive from edit modal: reuse same behavior as right-click context menu */
          if (t.status === 'archived') {
            await updateTask(t.id, { status: 'active' })
          } else {
            await updateTask(t.id, { status: 'archived' })
          }
        }}
        onMarkDeletedTask={async (t) => {
          /* Trash/Restore from edit modal: reuse same behavior as right-click context menu */
          if (t.status === 'deleted') {
            await updateTask(t.id, { status: 'active' })
          } else {
            await updateTask(t.id, { status: 'deleted' })
          }
        }}
        lineUpTaskIds={lineUpTaskIds}
        displayedLineupTaskIds={
          new Set(bonsaiSections.lineupTasks.map((t) => t.id))
        }
        isInTodaysLineup={
          editTask
            ? bonsaiSections.lineupTasks.some((t) => t.id === editTask.id)
            : undefined
        }
        onAddToLineUp={addToLineUp}
        onRemoveFromLineUp={removeFromLineUp}
      />

    </div>
  )
}
