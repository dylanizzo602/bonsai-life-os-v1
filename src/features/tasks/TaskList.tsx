/* TaskList component: Main task management interface with task list and CRUD */
import { useState, useEffect, useMemo, useRef } from 'react'
import { TaskListItem, useTaskListLayout } from './TaskListItem'
import { SubtaskList } from './SubtaskList'
import { HabitReminderItem } from '../habits/HabitReminderItem'
import type { HabitWithStreaks } from '../habits/types'
import { TaskContextPopover } from './modals/TaskContextPopover'
import {
  getTaskChecklists,
  getTaskChecklistItems,
  toggleChecklistItemComplete,
} from '../../lib/supabase/tasks'
import type { Task, TaskFilters, SortByEntry } from './types'

export interface TaskListProps {
  /** Tasks from useTasks */
  tasks: Task[]
  /** Task IDs that are "available" (can be worked on); used to auto-expand when all available and show subtasks separately when parent not available */
  availableTaskIds?: Set<string>
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Current filters */
  filters: TaskFilters
  /** Update filters */
  setFilters: (f: TaskFilters) => void
  /** Refetch tasks (e.g. after tag updates) */
  refetch?: () => void
  /** Update task */
  updateTask: (id: string, input: import('./types').UpdateTaskInput) => Promise<Task>
  /** Delete task */
  deleteTask: (id: string) => Promise<void>
  /** Toggle task completion (returns updated task for subtask list state) */
  toggleComplete: (id: string, completed: boolean) => Promise<Task>
  /** Fetch subtasks for a task */
  fetchSubtasks: (taskId: string) => Promise<Task[]>
  /** Create subtask */
  createSubtask: (parentId: string, input: { title: string }) => Promise<Task>
  /** Fetch all tasks (for dependency modal) */
  getTasks?: () => Promise<Task[]>
  /** Fetch task dependencies */
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('./types').TaskDependency[]
    blockedBy: import('./types').TaskDependency[]
  }>
  /** Create a task dependency */
  onAddDependency?: (input: import('./types').CreateTaskDependencyInput) => Promise<void>
  /** Remove a task dependency by id */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** Callback when user clicks to add a new task */
  onOpenAddModal?: () => void
  /** Callback when user clicks to edit a task */
  onOpenEditModal?: (task: Task) => void
  /** Create a new task (e.g. for Duplicate from context menu) */
  onCreateTask?: (input: import('./types').CreateTaskInput) => Promise<Task>
  /** Optional: Archive a task (context menu; sets status to archived) */
  onArchiveTask?: (task: Task) => void | Promise<void>
  /** Optional: Mark task as deleted (soft delete; sets status to deleted) */
  onMarkDeletedTask?: (task: Task) => void | Promise<void>
  /** Show only archived tasks (Archive at bottom of list) */
  onShowArchived?: () => void
  /** Show only deleted tasks (Trash at bottom of list) */
  onShowDeleted?: () => void
  /** Whether we are currently showing archived list */
  showArchived?: boolean
  /** Whether we are currently showing deleted list */
  showDeleted?: boolean
  /** Clear archive/trash view and return to main list */
  onClearArchiveTrashView?: () => void
  /** Today's Lineup task IDs (for context menu "Add to Today's Lineup" / "Remove from Today's Lineup") */
  lineUpTaskIds?: Set<string>
  onAddToLineUp?: (taskId: string) => void
  onRemoveFromLineUp?: (taskId: string) => void
  /** Linked habit tasks (streak + target/minimum/skip) */
  habitReminders?: Array<{ habit: HabitWithStreaks; task: Task; remindAt: string | null }>
  /** Habit IDs currently being updated via Target/Minimum/Skip (disables reminder action buttons). */
  habitActionInFlightIds?: Set<string>
  onHabitTargetComplete?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onHabitMinimum?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onHabitSkip?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  /** When true, hide completed/closed subtasks to match the current view filters (e.g. Available/All views) */
  hideCompletedSubtasks?: boolean
  /** Current view mode for the list (used to control how tasks and habit reminders are interleaved) */
  viewMode: 'lineup' | 'available' | 'all' | 'custom'
  /** Effective sort applied in the parent for this view (used to decide when to interleave by due date) */
  effectiveSortBy: SortByEntry[]
}

/**
 * Task list with filtering and task cards.
 * Receives all data and handlers from parent (TasksPage via useTasks).
 */
export function TaskList({
  tasks,
  availableTaskIds = new Set(),
  loading,
  error,
  filters: _filters,
  setFilters: _setFilters,
  refetch,
  onOpenAddModal: _onOpenAddModal,
  onOpenEditModal,
  onCreateTask,
  onArchiveTask,
  onMarkDeletedTask,
  /* Rest kept for interface; used when SubtaskList / TaskListItem need them */
  updateTask,
  deleteTask,
  toggleComplete,
  fetchSubtasks,
  createSubtask,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onShowArchived,
  onShowDeleted,
  showArchived = false,
  showDeleted = false,
  onClearArchiveTrashView,
  lineUpTaskIds,
  onAddToLineUp,
  onRemoveFromLineUp,
  habitReminders = [],
  habitActionInFlightIds,
  onHabitTargetComplete,
  onHabitMinimum,
  onHabitSkip,
  hideCompletedSubtasks = false,
  viewMode,
  effectiveSortBy,
}: TaskListProps) {
  /* Viewport bucket for habit row density (matches TaskListItem breakpoints) */
  const taskListViewport = useTaskListLayout()
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  /* Context menu state: which task is open and at what position */
  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 })
  /* Inline rename state: task id being edited in place (Rename from context menu) */
  const [editingNameTaskId, setEditingNameTaskId] = useState<string | null>(null)
  /** Task id that just expanded for adding a subtask (used to focus add-subtask input) */
  const [justExpandedForSubtask, setJustExpandedForSubtask] = useState<string | null>(null)
  const [_enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [taskEnrichment, setTaskEnrichment] = useState<Record<string, {
    checklistSummary?: { completed: number; total: number }
    hasSubtasks: boolean
    /** Total subtasks (for enrichment bookkeeping; icon uses incomplete count only) */
    subtaskCount: number
    /** Subtasks not completed (icon badge + unresolved-items modal) */
    incompleteSubtaskCount: number
    /** Sum of subtask time_estimate in minutes (for "total with subtasks" display) */
    subtaskTimeTotal: number
    isBlocked: boolean
    isBlocking: boolean
    blockingCount: number
    blockedByCount: number
  }>>({})

  /* Fetch enrichment data for all tasks: checklists, subtask counts, dependencies */
  const loadEnrichment = async () => {
    if (!fetchSubtasks) return
    setEnrichmentLoading(true)
    const enrichment: typeof taskEnrichment = {}
    try {
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const [checklists, subtasksResult, deps] = await Promise.all([
              getTaskChecklists(task.id).catch((err) => {
                console.error(`Error fetching checklists for task ${task.id}:`, err)
                return []
              }),
              fetchSubtasks(task.id).catch((err) => {
                console.error(`Error fetching subtasks for task ${task.id}:`, err)
                return []
              }),
              (getTaskDependencies?.(task.id) ?? Promise.resolve({ blocking: [], blockedBy: [] })).catch((err) => {
                console.error(`Error fetching dependencies for task ${task.id}:`, err)
                return { blocking: [], blockedBy: [] }
              }),
            ])
            const subtasks = Array.isArray(subtasksResult) ? subtasksResult : []
            const subtaskCount = subtasks.length
            const incompleteSubtaskCount = subtasks.filter((s) => s.status !== 'completed').length
            const subtaskTimeTotal = subtasks.reduce((sum, st) => sum + (st.time_estimate ?? 0), 0)
            let completed = 0
            let total = 0
            for (const c of checklists) {
              const items = await getTaskChecklistItems(c.id).catch(() => [])
              total += items.length
              completed += items.filter((i) => i.completed).length
            }
            enrichment[task.id] = {
              checklistSummary: total > 0 ? { completed, total } : undefined,
              hasSubtasks: subtaskCount > 0,
              subtaskCount,
              incompleteSubtaskCount,
              subtaskTimeTotal,
              isBlocked: deps.blockedBy.length > 0,
              isBlocking: deps.blocking.length > 0,
              blockingCount: deps.blocking.length,
              blockedByCount: deps.blockedBy.length,
            }
          } catch (err) {
            console.error(`Error loading enrichment for task ${task.id}:`, err)
            enrichment[task.id] = {
              hasSubtasks: false,
              subtaskCount: 0,
              incompleteSubtaskCount: 0,
              subtaskTimeTotal: 0,
              isBlocked: false,
              isBlocking: false,
              blockingCount: 0,
              blockedByCount: 0,
            }
          }
        }),
      )
      setTaskEnrichment(enrichment)
    } finally {
      setEnrichmentLoading(false)
    }
  }

  useEffect(() => {
    if (tasks.length > 0) {
      loadEnrichment()
    } else {
      setTaskEnrichment({})
      setEnrichmentLoading(false)
    }
  }, [tasks, fetchSubtasks])

  /* When enrichment first loads for current tasks: default-expand tasks that are available and have subtasks (so "all can be worked on" shows expanded). Only apply once per task set so user collapse is not overwritten. */
  const taskIdsRef = useRef<string>('')
  const appliedDefaultExpandRef = useRef(false)
  useEffect(() => {
    const taskIds = tasks.map((t) => t.id).join(',')
    if (taskIds !== taskIdsRef.current) {
      taskIdsRef.current = taskIds
      appliedDefaultExpandRef.current = false
    }
    if (Object.keys(taskEnrichment).length === 0 || appliedDefaultExpandRef.current) return
    appliedDefaultExpandRef.current = true
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      for (const task of tasks) {
        const en = taskEnrichment[task.id]
        if (en?.hasSubtasks && availableTaskIds.has(task.id)) next.add(task.id)
      }
      return next
    })
  }, [taskEnrichment, tasks, availableTaskIds])

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  /* Combine tasks and habit reminders; interleave when sort can apply across item types */
  const combinedItems = useMemo(() => {
    const items: Array<{
      type: 'task' | 'habit_reminder'
      id: string
      created_at: string
      sourceIndex: number
      task?: Task
      habitReminder?: { habit: HabitWithStreaks; task: Task; remindAt: string | null }
    }> = []

    /* Stable ordering: keep the original insertion order as a tie-breaker so task ordering from TasksPage is preserved. */
    let sourceIndex = 0

    /* Add tasks in their current order (already sorted by TasksPage) */
    tasks.forEach((task) => {
      items.push({
        type: 'task',
        id: task.id,
        created_at: task.created_at,
        sourceIndex: sourceIndex++,
        task,
      })
    })

    /* Add habit reminders (streak + Complete/Skip + notification time) */
    habitReminders.forEach(({ habit, task, remindAt }) => {
      items.push({
        type: 'habit_reminder',
        id: `habit-${habit.id}`,
        created_at: habit.created_at,
        sourceIndex: sourceIndex++,
        habitReminder: { habit, task, remindAt },
      })
    })

    /* Interleaving sort: if the active sort includes fields that apply to tasks and habit rows, sort the combined list accordingly. */
    const canInterleave =
      (viewMode === 'available' || viewMode === 'all' || viewMode === 'custom') &&
      effectiveSortBy.some((s) => s.field === 'due_date' || s.field === 'start_date' || s.field === 'task_name')

    if (canInterleave) {
      /* Shared sort keys: map task/habit reminder to comparable values for date or name sorts. */
      const getTimestampForField = (
        item: (typeof items)[number],
        field: 'start_date' | 'due_date',
      ): number => {
        if (item.type === 'task' && item.task) {
          const iso = field === 'due_date' ? item.task.due_date : item.task.start_date
          return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER
        }
        if (item.type === 'habit_reminder' && item.habitReminder) {
          const due = item.habitReminder.task.due_date ?? item.habitReminder.remindAt
          return due ? new Date(due).getTime() : Number.MAX_SAFE_INTEGER
        }
        return Number.MAX_SAFE_INTEGER
      }

      const getName = (item: (typeof items)[number]) => {
        if (item.type === 'task' && item.task) return item.task.title ?? ''
        if (item.type === 'habit_reminder' && item.habitReminder) return item.habitReminder.task.title ?? ''
        return ''
      }

      items.sort((a, b) => {
        for (const { field, direction } of effectiveSortBy) {
          let cmp = 0
          if (field === 'due_date' || field === 'start_date') {
            cmp = getTimestampForField(a, field) - getTimestampForField(b, field)
          } else if (field === 'task_name') {
            cmp = getName(a).localeCompare(getName(b), undefined, { sensitivity: 'base' })
          } else {
            continue
          }
          if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
        }
        /* Tie-breaker: stable original order so pre-sorted task ordering is preserved (e.g. Available priority/status rules). */
        return a.sourceIndex - b.sourceIndex
      })
    }

    return items
  }, [tasks, habitReminders, viewMode, effectiveSortBy])

  /* Subtask rendering mode: in filtered views, subtasks appear as their own rows in the main list. */
  const showInlineSubtaskLists = viewMode === 'lineup'

  /* Parent title lookup: used to label subtasks when they appear as independent rows. */
  const taskTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tasks) {
      map.set(t.id, t.title ?? '')
    }
    return map
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* Error messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-bonsai-slate-500">Loading...</div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && habitReminders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-bonsai-slate-600 text-lg">No tasks found</p>
          <p className="text-bonsai-slate-500 text-sm mt-2">
            Create your first task to get started
          </p>
        </div>
      )}

      {/* Combined list: tasks and habit reminders; TaskListItem picks layout from viewport internally */}
      {!loading && combinedItems.length > 0 && (
        <div className="space-y-2 lg:space-y-4">
          {combinedItems.map((item) => {
            if (
              item.type === 'habit_reminder' &&
              item.habitReminder &&
              onHabitTargetComplete &&
              onHabitMinimum &&
              onHabitSkip
            ) {
              const { habit, task, remindAt } = item.habitReminder
              return (
                <HabitReminderItem
                  key={item.id}
                  habit={habit}
                  task={task}
                  remindAt={remindAt}
                  reminderTime={habit.reminder_time}
                  onTargetComplete={() => onHabitTargetComplete(habit, task, remindAt)}
                  onMinimum={() => onHabitMinimum(habit, task, remindAt)}
                  onSkip={() => onHabitSkip(habit, task, remindAt)}
                  /* Disable while the parent is processing a habit entry update (prevents double submits). */
                  actionsDisabled={Boolean(habitActionInFlightIds?.has(habit.id))}
                  density={taskListViewport === 'desktop' ? undefined : 'compact'}
                  showStreakBreakdown={false}
                />
              )
            }
            if (item.type === 'task' && item.task) {
              const task = item.task
              const enrichment = taskEnrichment[task.id] ?? {
                hasSubtasks: false,
                subtaskCount: 0,
                incompleteSubtaskCount: 0,
                subtaskTimeTotal: 0,
                isBlocked: false,
                isBlocking: false,
                blockingCount: 0,
                blockedByCount: 0,
              }
              const isExpanded = expandedTasks.has(task.id)
              const totalTimeWithSubtasks = (task.time_estimate ?? 0) + (enrichment.subtaskTimeTotal ?? 0)
              return (
                <div key={task.id} className="space-y-2">
                  <TaskListItem
                    layout="responsive"
                    task={task}
                    parentTaskTitle={
                      task.parent_id ? taskTitleById.get(task.parent_id) ?? 'Parent task' : null
                    }
                    onClick={() => editingNameTaskId !== task.id && onOpenEditModal?.(task)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextTask(task)
                      setContextPosition({ x: e.clientX, y: e.clientY })
                    }}
                    inlineEditTitle={
                      editingNameTaskId === task.id
                        ? {
                            value: task.title,
                            onSave: async (newTitle) => {
                              await updateTask(task.id, { title: newTitle })
                              setEditingNameTaskId(null)
                              refetch?.()
                            },
                            onCancel: () => setEditingNameTaskId(null),
                          }
                        : undefined
                    }
                    hasSubtasks={enrichment.hasSubtasks}
                    incompleteSubtaskCount={enrichment.incompleteSubtaskCount}
                    checklistSummary={enrichment.checklistSummary}
                    totalTimeWithSubtasks={totalTimeWithSubtasks}
                    isBlocked={enrichment.isBlocked}
                    isBlocking={enrichment.isBlocking}
                    blockingCount={enrichment.blockingCount}
                    blockedByCount={enrichment.blockedByCount}
                    expanded={isExpanded}
                    onToggleExpand={() => toggleExpand(task.id)}
                    onExpandForSubtask={() => setJustExpandedForSubtask(task.id)}
                    onTagsUpdated={refetch}
                    onUpdateStatus={async (taskId, status) => {
                      try {
                        if (status === 'completed') {
                          await toggleComplete(taskId, true)
                        } else {
                          await updateTask(taskId, { status })
                        }
                      } catch (error) {
                        console.error('Failed to update task status:', error)
                        throw error
                      }
                    }}
                    onCompleteTaskAndResolveAll={async (taskId) => {
                      try {
                        const subtasks = await fetchSubtasks(taskId)
                        for (const st of subtasks) {
                          if (st.status !== 'completed') await toggleComplete(st.id, true)
                        }
                        const checklists = await getTaskChecklists(taskId)
                        for (const c of checklists) {
                          const items = await getTaskChecklistItems(c.id)
                          for (const checklistItem of items) {
                            if (!checklistItem.completed) await toggleChecklistItemComplete(checklistItem.id, true)
                          }
                        }
                        await toggleComplete(taskId, true)
                        refetch?.()
                        await loadEnrichment()
                      } catch (error) {
                        console.error('Failed to complete task and resolve items:', error)
                        throw error
                      }
                    }}
                    onUpdateTask={async (taskId, input) => {
                      try {
                        await updateTask(taskId, input)
                      } catch (error) {
                        console.error('Failed to update task:', error)
                        throw error
                      }
                    }}
                    getTasks={getTasks}
                    getTaskDependencies={getTaskDependencies}
                    onAddDependency={onAddDependency}
                    onRemoveDependency={onRemoveDependency}
                    onDependenciesChanged={loadEnrichment}
                  />
                  {showInlineSubtaskLists &&
                    isExpanded &&
                    fetchSubtasks &&
                    createSubtask &&
                    updateTask &&
                    deleteTask &&
                    toggleComplete && (
                    <div className="ml-4 pl-3 border-l-2 border-bonsai-slate-200 lg:ml-8 lg:pl-4">
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
                        onRemoveDependency={onRemoveDependency}
                        focusAddInput={justExpandedForSubtask === task.id}
                        onFocusAddInputConsumed={() => setJustExpandedForSubtask(null)}
                        hideCompletedSubtasks={hideCompletedSubtasks}
                        onSubtasksChanged={loadEnrichment}
                      />
                    </div>
                  )}
                </div>
              )
            }
            return null
          })}
        </div>
      )}

      {/* Task context popover: Right-click on a task shows Rename, Duplicate, Archive, Delete */}
      {contextTask && (
        <TaskContextPopover
          isOpen={true}
          onClose={() => setContextTask(null)}
          x={contextPosition.x}
          y={contextPosition.y}
          task={contextTask}
          onRename={(t) => {
            setContextTask(null)
            setEditingNameTaskId(t.id)
          }}
          onDuplicate={async (t) => {
            if (!onCreateTask) return
            await onCreateTask({
              title: `${t.title} (copy)`,
              description: t.description ?? undefined,
              start_date: t.start_date ?? undefined,
              due_date: t.due_date ?? undefined,
              priority: t.priority,
              time_estimate: t.time_estimate ?? undefined,
              status: 'active',
            })
            refetch?.()
          }}
          onArchive={onArchiveTask}
          onMarkDeleted={onMarkDeletedTask}
          lineUpTaskIds={lineUpTaskIds}
          onAddToLineUp={onAddToLineUp}
          onRemoveFromLineUp={onRemoveFromLineUp}
        />
      )}

      {/* Archive and Trash controls at bottom of task list */}
      {onShowArchived != null && onShowDeleted != null && (
        <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-bonsai-slate-200">
          <button
            type="button"
            onClick={onShowArchived}
            className={`text-secondary font-medium transition-colors ${showArchived ? 'text-bonsai-sage-700 underline' : 'text-bonsai-slate-600 hover:text-bonsai-slate-800'}`}
            aria-pressed={showArchived}
          >
            Archive
          </button>
          <button
            type="button"
            onClick={onShowDeleted}
            className={`text-secondary font-medium transition-colors ${showDeleted ? 'text-bonsai-sage-700 underline' : 'text-bonsai-slate-600 hover:text-bonsai-slate-800'}`}
            aria-pressed={showDeleted}
          >
            Trash
          </button>
          {(showArchived || showDeleted) && onClearArchiveTrashView && (
            <button
              type="button"
              onClick={onClearArchiveTrashView}
              className="text-secondary font-medium text-bonsai-slate-600 hover:text-bonsai-slate-800"
            >
              Back to list
            </button>
          )}
        </div>
      )}
    </div>
  )
}
