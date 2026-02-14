/* DependenciesSection: Displays "blocked by" and "blocking" dependencies with search/link UI */

import { useState, useEffect, useCallback } from 'react'
import {
  BlockedIcon,
  WarningIcon,
} from '../../components/icons'
import { TaskSearchSelect } from '../../components/TaskSearchSelect'
import { CompactTaskItem } from './CompactTaskItem'
import type { Task, TaskDependency, CreateTaskDependencyInput } from './types'

export interface DependenciesSectionProps {
  /** Current task/subtask id */
  currentTaskId: string
  /** Fetch all tasks for linking and resolving dependency details */
  getTasks: () => Promise<Task[]>
  /** Fetch blocking and blocked-by dependencies for current task */
  getTaskDependencies: (taskId: string) => Promise<{
    blocking: TaskDependency[]
    blockedBy: TaskDependency[]
  }>
  /** Create a dependency link */
  onAddDependency: (input: CreateTaskDependencyInput) => Promise<void>
  /** Remove a dependency by id (optional) */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** Called when dependencies change (e.g. to refetch parent list enrichment) */
  onDependenciesChanged?: () => void
}

/* Format date for display (e.g. Jan 22 or Jan 22 at 12pm). Date-only (YYYY-MM-DD) parsed as local. */
function formatDueDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const isDateOnly = !iso.includes('T')
  const d = isDateOnly
    ? (() => {
        const [y, m, day] = iso.split('-').map(Number)
        return new Date(y, (m ?? 1) - 1, day ?? 1)
      })()
    : new Date(iso)
  if (isNaN(d.getTime())) return null
  if (isDateOnly) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}


/**
 * Dependencies section for add/edit task and subtask modals.
 * Shows "This task is blocked by" with inline search/link and cards; "This task is blocking." with inline search/link.
 * Uses TaskSearchSelect for inline task search and linking.
 */
export function DependenciesSection({
  currentTaskId,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onDependenciesChanged,
}: DependenciesSectionProps) {
  const [blocking, setBlocking] = useState<TaskDependency[]>([])
  const [blockedBy, setBlockedBy] = useState<TaskDependency[]>([])
  const [taskMap, setTaskMap] = useState<Record<string, Task>>({})
  const [loading, setLoading] = useState(false)

  /* Fetch dependencies and build task map when section mounts or currentTaskId changes */
  const fetchDependencies = useCallback(async () => {
    if (!currentTaskId) return
    setLoading(true)
    try {
      const [allTasks, deps] = await Promise.all([
        getTasks(),
        getTaskDependencies(currentTaskId),
      ])
      setBlocking(deps.blocking)
      setBlockedBy(deps.blockedBy)
      const map: Record<string, Task> = {}
      allTasks.forEach((t) => {
        map[t.id] = t
      })
      setTaskMap(map)
    } catch (err) {
      console.error('Error fetching dependencies:', err)
    } finally {
      setLoading(false)
    }
  }, [currentTaskId, getTasks, getTaskDependencies])

  useEffect(() => {
    fetchDependencies()
  }, [fetchDependencies])

  /* Handle task selected for "blocked by": create dependency and refetch */
  const handleBlockedBySelect = useCallback(
    async (task: { id: string; title: string }) => {
      try {
        await onAddDependency({
          blocker_id: task.id,
          blocked_id: currentTaskId,
        })
        await fetchDependencies()
        onDependenciesChanged?.()
      } catch (err) {
        console.error('Error adding blocked-by dependency:', err)
      }
    },
    [currentTaskId, onAddDependency, fetchDependencies, onDependenciesChanged],
  )

  /* Handle task selected for "blocking": create dependency and refetch */
  const handleBlockingSelect = useCallback(
    async (task: { id: string; title: string }) => {
      try {
        await onAddDependency({
          blocker_id: currentTaskId,
          blocked_id: task.id,
        })
        await fetchDependencies()
        onDependenciesChanged?.()
      } catch (err) {
        console.error('Error adding blocking dependency:', err)
      }
    },
    [currentTaskId, onAddDependency, fetchDependencies, onDependenciesChanged],
  )

  /* Map full Task[] to TaskOption[] for TaskSearchSelect */
  const getTasksForSearch = useCallback(async () => {
    const tasks = await getTasks()
    return tasks.map((t) => ({ id: t.id, title: t.title }))
  }, [getTasks])

  /* Resolve blocker task for a blockedBy dependency */
  const getBlockerTask = (dep: TaskDependency) => taskMap[dep.blocker_id]
  /* Resolve blocked task for a blocking dependency */
  const getBlockedTask = (dep: TaskDependency) => taskMap[dep.blocked_id]

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
      {/* "This task is blocked by" section: BlockedIcon, search input, linked task cards */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <BlockedIcon className="w-5 h-5 text-bonsai-slate-700 shrink-0" aria-hidden />
          <span className="text-sm font-medium text-bonsai-slate-700">
            This task is blocked by
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
          {/* TaskSearchSelect: search and link blocking tasks */}
          <TaskSearchSelect
            getTasks={getTasksForSearch}
            onSelectTask={handleBlockedBySelect}
            excludeTaskIds={[currentTaskId]}
            placeholder="Search tasks by name..."
            aria-label="Search and link blocking tasks"
          />
          {/* Blocked-by cards: each shows task title and metadata */}
          {!loading &&
            blockedBy.map((dep) => {
              const task = getBlockerTask(dep)
              if (!task) return null
              return (
                <CompactTaskItem
                  key={dep.id}
                  task={task}
                  isBlocked={true}
                  onRemove={
                    onRemoveDependency
                      ? async () => {
                          await onRemoveDependency(dep.id)
                          await fetchDependencies()
                          onDependenciesChanged?.()
                        }
                      : undefined
                  }
                  onDependencyClick={undefined}
                  formatDueDate={formatDueDate}
                />
              )
            })}
        </div>
      </div>

      {/* "This task is blocking." section: WarningIcon, link action */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <WarningIcon className="w-5 h-5 shrink-0 text-bonsai-slate-700" aria-hidden />
          <span className="text-sm font-medium text-bonsai-slate-700">
            This task is blocking.
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
          {/* TaskSearchSelect: search and link tasks this task blocks */}
          <TaskSearchSelect
            getTasks={getTasksForSearch}
            onSelectTask={handleBlockingSelect}
            excludeTaskIds={[currentTaskId]}
            placeholder="Search tasks by name..."
            aria-label="Search and link tasks this task blocks"
          />
          {/* Blocking cards: tasks this task blocks */}
          {!loading &&
            blocking.map((dep) => {
              const task = getBlockedTask(dep)
              if (!task) return null
              return (
                <CompactTaskItem
                  key={dep.id}
                  task={task}
                  isBlocking={true}
                  onRemove={
                    onRemoveDependency
                      ? async () => {
                          await onRemoveDependency(dep.id)
                          await fetchDependencies()
                          onDependenciesChanged?.()
                        }
                      : undefined
                  }
                  onDependencyClick={undefined}
                  formatDueDate={formatDueDate}
                />
              )
            })}
        </div>
      </div>

    </div>
  )
}
