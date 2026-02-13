/* DependenciesSection: Displays "blocked by" and "blocking" dependencies with search/link UI */

import { useState, useEffect, useCallback } from 'react'
import {
  BlockedIcon,
  WarningIcon,
  PlusIcon,
} from '../../components/icons'
import { TaskDependencyModal } from './modals/TaskDependencyModal'
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
 * Shows "This task is blocked by" with search/link and cards; "This task is blocking." with link action.
 * Clicking dependency icon or search opens TaskDependencyModal.
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
  const [dependencyModalOpen, setDependencyModalOpen] = useState(false)
  /* Search query for "blocked by" input - opens modal on focus/click */
  const [blockedBySearchValue, setBlockedBySearchValue] = useState('')

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

  /* Handle dependency added: refetch and close modal */
  const handleDependencyAdded = useCallback(async () => {
    await fetchDependencies()
  }, [fetchDependencies])

  /* Resolve blocker task for a blockedBy dependency */
  const getBlockerTask = (dep: TaskDependency) => taskMap[dep.blocker_id]
  /* Resolve blocked task for a blocking dependency */
  const getBlockedTask = (dep: TaskDependency) => taskMap[dep.blocked_id]

  return (
    <div className="space-y-4">
      {/* "This task is blocked by" section: BlockedIcon, search input, linked task cards */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BlockedIcon className="w-5 h-5 text-bonsai-slate-700 shrink-0" aria-hidden />
          <span className="text-sm font-medium text-bonsai-slate-700">
            This task is blocked by
          </span>
        </div>
        <div className="space-y-2">
          {/* Search/link input: clicking focuses and opens modal for adding blocked-by */}
          <div
            className="rounded-lg border border-dashed border-bonsai-slate-300 bg-white px-3 py-2 focus-within:border-bonsai-sage-500 focus-within:ring-1 focus-within:ring-bonsai-sage-500"
            onClick={() => setDependencyModalOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setDependencyModalOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="Search and link blocking tasks"
          >
            <input
              type="text"
              placeholder="Enter the task name here, this is an example..."
              value={blockedBySearchValue}
              onChange={(e) => setBlockedBySearchValue(e.target.value)}
              onFocus={() => setDependencyModalOpen(true)}
              className="w-full bg-transparent text-sm text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none"
              readOnly
            />
          </div>
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
                  onDependencyClick={() => setDependencyModalOpen(true)}
                  formatDueDate={formatDueDate}
                />
              )
            })}
        </div>
      </div>

      {/* "This task is blocking." section: WarningIcon, link action */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <WarningIcon className="w-5 h-5 text-bonsai-slate-700 shrink-0" aria-hidden />
          <span className="text-sm font-medium text-bonsai-slate-700">
            This task is blocking.
          </span>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setDependencyModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-bonsai-sage-600 hover:text-bonsai-sage-700 hover:underline"
          >
            <PlusIcon className="w-4 h-4" />
            Link existing task.
          </button>
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
                  onDependencyClick={() => setDependencyModalOpen(true)}
                  formatDueDate={formatDueDate}
                />
              )
            })}
        </div>
      </div>

      {/* TaskDependencyModal: opens from search input, link button, or dependency icon */}
      <TaskDependencyModal
        isOpen={dependencyModalOpen}
        onClose={() => setDependencyModalOpen(false)}
        currentTaskId={currentTaskId}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={async (input) => {
          await onAddDependency(input)
          await handleDependencyAdded()
          onDependenciesChanged?.()
        }}
      />
    </div>
  )
}
