/* TaskList component: Main task management interface with task list and CRUD */
import { useState, useEffect, useMemo } from 'react'
import { FullTaskItem } from './FullTaskItem'
import { CompactTaskItem } from './CompactTaskItem'
import { SubtaskList } from './SubtaskList'
import { ReminderItem } from '../reminders/ReminderItem'
import { TaskContextPopover } from './modals/TaskContextPopover'
import { ReminderContextPopover } from '../reminders/ReminderContextPopover'
import {
  getTaskChecklists,
  getTaskChecklistItems,
  toggleChecklistItemComplete,
} from '../../lib/supabase/tasks'
import type { Task, TaskFilters } from './types'
import type { Reminder } from '../reminders/types'

export interface TaskListProps {
  /** Tasks from useTasks */
  tasks: Task[]
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
  /** Reminders to display alongside tasks */
  reminders?: Reminder[]
  /** Reminders loading state */
  remindersLoading?: boolean
  /** Reminders error message */
  remindersError?: string | null
  /** Toggle reminder completion */
  onToggleReminderComplete?: (id: string, completed: boolean) => void
  /** Open edit modal for a reminder */
  onEditReminder?: (reminder: Reminder) => void
  /** Update a reminder (e.g. for inline rename) */
  onUpdateReminder?: (id: string, input: import('../reminders/types').UpdateReminderInput) => Promise<Reminder>
  /** Create a new reminder (e.g. for Duplicate from context menu) */
  onCreateReminder?: (input: import('../reminders/types').CreateReminderInput) => Promise<Reminder>
  /** Delete a reminder */
  /** Mark reminder as deleted (soft delete) */
  onMarkDeletedReminder?: (reminder: Reminder) => void | Promise<void>
  onDeleteReminder?: (id: string) => Promise<void>
}

/**
 * Task list with filtering and task cards.
 * Receives all data and handlers from parent (TasksPage via useTasks).
 */
export function TaskList({
  tasks,
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
  /* Rest kept for interface; used when SubtaskList/FullTaskItem need them */
  updateTask,
  deleteTask,
  toggleComplete,
  fetchSubtasks,
  createSubtask,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  reminders = [],
  remindersLoading = false,
  remindersError = null,
  onToggleReminderComplete,
  onEditReminder,
  onUpdateReminder,
  onCreateReminder,
  onMarkDeletedReminder,
  onDeleteReminder,
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  /* Context menu state: which task or reminder is open and at what position */
  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextReminder, setContextReminder] = useState<Reminder | null>(null)
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 })
  /* Inline rename state: task or reminder id being edited in place (Rename from context menu) */
  const [editingNameTaskId, setEditingNameTaskId] = useState<string | null>(null)
  const [editingNameReminderId, setEditingNameReminderId] = useState<string | null>(null)
  /** Task id that just expanded for adding a subtask (used to focus add-subtask input) */
  const [justExpandedForSubtask, setJustExpandedForSubtask] = useState<string | null>(null)
  const [_enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [taskEnrichment, setTaskEnrichment] = useState<Record<string, {
    checklistSummary?: { completed: number; total: number }
    hasSubtasks: boolean
    /** Number of subtasks that are not completed (for unresolved-items modal) */
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
              hasSubtasks: subtasks.length > 0,
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

  /* Combine tasks and reminders into a single sorted list: sort by created_at (newest first) */
  const combinedItems = useMemo(() => {
    const items: Array<{ type: 'task' | 'reminder'; id: string; created_at: string; task?: Task; reminder?: Reminder }> = []
    
    /* Add tasks */
    tasks.forEach((task) => {
      items.push({
        type: 'task',
        id: task.id,
        created_at: task.created_at,
        task,
      })
    })
    
    /* Add reminders */
    reminders.forEach((reminder) => {
      items.push({
        type: 'reminder',
        id: reminder.id,
        created_at: reminder.created_at || new Date().toISOString(),
        reminder,
      })
    })
    
    /* Sort by created_at descending (newest first) */
    return items.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return bTime - aTime
    })
  }, [tasks, reminders])

  return (
    <div className="space-y-6">
      {/* Error messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {remindersError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {remindersError}
        </div>
      )}

      {/* Loading state */}
      {(loading || remindersLoading) && (
        <div className="text-center py-8 text-bonsai-slate-500">Loading...</div>
      )}

      {/* Empty state */}
      {!loading && !remindersLoading && tasks.length === 0 && reminders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-bonsai-slate-600 text-lg">No tasks or reminders found</p>
          <p className="text-bonsai-slate-500 text-sm mt-2">
            Create your first task or reminder to get started
          </p>
        </div>
      )}

      {/* Combined list: Tasks and reminders together, visible on all breakpoints */}
      {!loading && !remindersLoading && combinedItems.length > 0 && (
        <>
          {/* Desktop (lg+): Full task items with expandable subtasks, reminders as ReminderItem */}
          <div className="hidden lg:block space-y-4">
            {combinedItems.map((item) => {
              if (item.type === 'reminder' && item.reminder) {
                const reminder = item.reminder
                return (
                  <ReminderItem
                    key={item.id}
                    reminder={reminder}
                    onToggleComplete={onToggleReminderComplete || (() => {})}
                    onEdit={onEditReminder || (() => {})}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextReminder(reminder)
                      setContextPosition({ x: e.clientX, y: e.clientY })
                    }}
                    inlineEditName={
                      editingNameReminderId === reminder.id && onUpdateReminder
                        ? {
                            value: reminder.name,
                            onSave: async (newName) => {
                              await onUpdateReminder(reminder.id, { name: newName })
                              setEditingNameReminderId(null)
                            },
                            onCancel: () => setEditingNameReminderId(null),
                          }
                        : undefined
                    }
                    onUpdateReminder={onUpdateReminder}
                  />
                )
              }
              if (item.type === 'task' && item.task) {
                const task = item.task
              const enrichment = taskEnrichment[task.id] ?? {
                hasSubtasks: false,
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
                  <FullTaskItem
                    task={task}
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
                        await updateTask(taskId, { status })
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
                          for (const item of items) {
                            if (!item.completed) await toggleChecklistItemComplete(item.id, true)
                          }
                        }
                        await updateTask(taskId, { status: 'completed' })
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
                  {isExpanded && fetchSubtasks && createSubtask && updateTask && deleteTask && toggleComplete && (
                    <div className="ml-8 pl-4 border-l-2 border-bonsai-slate-200">
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
                      />
                    </div>
                  )}
                </div>
              )
              }
              return null
            })}
          </div>
          {/* Mobile (< md): compact task items with collapsible subtasks; reminders as ReminderItem; tap opens edit modal */}
          <div className="md:hidden space-y-2">
            {combinedItems.map((item) => {
              if (item.type === 'reminder' && item.reminder) {
                const reminder = item.reminder
                return (
                  <ReminderItem
                    key={item.id}
                    reminder={reminder}
                    onToggleComplete={onToggleReminderComplete || (() => {})}
                    onEdit={onEditReminder || (() => {})}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextReminder(reminder)
                      setContextPosition({ x: e.clientX, y: e.clientY })
                    }}
                    inlineEditName={
                      editingNameReminderId === reminder.id && onUpdateReminder
                        ? {
                            value: reminder.name,
                            onSave: async (newName) => {
                              await onUpdateReminder(reminder.id, { name: newName })
                              setEditingNameReminderId(null)
                            },
                            onCancel: () => setEditingNameReminderId(null),
                          }
                        : undefined
                    }
                    onUpdateReminder={onUpdateReminder}
                  />
                )
              }
              if (item.type === 'task' && item.task) {
                const task = item.task
              const enrichment = taskEnrichment[task.id] ?? {
                hasSubtasks: false,
                incompleteSubtaskCount: 0,
                subtaskTimeTotal: 0,
                isBlocked: false,
                isBlocking: false,
                blockingCount: 0,
                blockedByCount: 0,
              }
              const isExpanded = expandedTasks.has(task.id)
              return (
                <div key={task.id} className="space-y-2">
                  <CompactTaskItem
                    task={task}
                    hasSubtasks={enrichment.hasSubtasks}
                    expanded={isExpanded}
                    onToggleExpand={() => toggleExpand(task.id)}
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
                    isBlocked={enrichment.isBlocked}
                    isBlocking={enrichment.isBlocking}
                  />
                  {isExpanded && fetchSubtasks && createSubtask && updateTask && deleteTask && toggleComplete && (
                    <div className="ml-4 pl-3 border-l-2 border-bonsai-slate-200">
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
                      />
                    </div>
                  )}
                </div>
              )
              }
              return null
            })}
          </div>
          {/* Tablet (md to lg): tablet task items, reminders as ReminderItem; no hover tooltips; tap opens edit modal */}
          <div className="hidden md:block lg:hidden space-y-2">
            {combinedItems.map((item) => {
              if (item.type === 'reminder' && item.reminder) {
                const reminder = item.reminder
                return (
                  <ReminderItem
                    key={item.id}
                    reminder={reminder}
                    onToggleComplete={onToggleReminderComplete || (() => {})}
                    onEdit={onEditReminder || (() => {})}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextReminder(reminder)
                      setContextPosition({ x: e.clientX, y: e.clientY })
                    }}
                    inlineEditName={
                      editingNameReminderId === reminder.id && onUpdateReminder
                        ? {
                            value: reminder.name,
                            onSave: async (newName) => {
                              await onUpdateReminder(reminder.id, { name: newName })
                              setEditingNameReminderId(null)
                            },
                            onCancel: () => setEditingNameReminderId(null),
                          }
                        : undefined
                    }
                    onUpdateReminder={onUpdateReminder}
                  />
                )
              }
              if (item.type === 'task' && item.task) {
                const task = item.task
              const enrichment = taskEnrichment[task.id] ?? {
                hasSubtasks: false,
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
                  <FullTaskItem
                    tablet={true}
                    task={task}
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
                    onTagsUpdated={refetch}
                    onUpdateStatus={async (taskId, status) => {
                      try {
                        await updateTask(taskId, { status })
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
                          for (const item of items) {
                            if (!item.completed) await toggleChecklistItemComplete(item.id, true)
                          }
                        }
                        await updateTask(taskId, { status: 'completed' })
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
                  {isExpanded && fetchSubtasks && createSubtask && updateTask && deleteTask && toggleComplete && (
                    <div className="ml-4 pl-3 border-l-2 border-bonsai-slate-200">
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
                      />
                    </div>
                  )}
                </div>
              )
              }
              return null
            })}
          </div>
        </>
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
          onDelete={async (t) => {
            await deleteTask(t.id)
            setContextTask(null)
            refetch?.()
          }}
        />
      )}

      {/* Reminder context popover: Right-click on a reminder shows Rename, Duplicate, Delete */}
      {contextReminder && (
        <ReminderContextPopover
          isOpen={true}
          onClose={() => setContextReminder(null)}
          x={contextPosition.x}
          y={contextPosition.y}
          reminder={contextReminder}
          onRename={(r) => {
            setContextReminder(null)
            setEditingNameReminderId(r.id)
          }}
          onDuplicate={async (r) => {
            if (onCreateReminder) await onCreateReminder({ name: `${r.name} (copy)`, remind_at: r.remind_at ?? undefined })
          }}
          onMarkDeleted={onMarkDeletedReminder}
          onDelete={async (r) => {
            if (onDeleteReminder) {
              await onDeleteReminder(r.id)
              setContextReminder(null)
            }
          }}
        />
      )}
    </div>
  )
}
