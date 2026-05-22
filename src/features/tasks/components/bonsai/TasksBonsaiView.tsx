/* TasksBonsaiView: Today's Lineup + Other tasks Bonsai layout */

import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { TaskContextPopover } from '../../modals/TaskContextPopover'
import { useTaskRowEnrichment } from '../../hooks/useTaskRowEnrichment'
import type { CreateTaskInput, Task, Tag, TagColorId } from '../../types'
import { EMPTY_TASK_ENRICHMENT } from '../../types/taskRowEnrichment'
import { useUserTimeZone } from '../../../settings/useUserTimeZone'
import { buildBacklogPartition } from '../../utils/partitionBonsaiTasks'
import { LineupTaskCard } from './LineupTaskCard'
import { OtherTasksSection } from './OtherTasksSection'
import { TasksSectionHeader } from './TasksSectionHeader'

interface TasksBonsaiViewProps {
  tasks: Task[]
  lineupTasks: Task[]
  backlogPool: Task[]
  loading?: boolean
  error?: string | null
  searchQuery: string
  searchExpanded: boolean
  onSearchQueryChange: (value: string) => void
  onSearchExpandedChange: (expanded: boolean) => void
  onOpenFilter: () => void
  onAddTask: () => void
  onOpenEdit: (task: Task) => void
  onShowDeleted: () => void
  refetch?: () => void
  toggleComplete: (id: string, completed: boolean) => Promise<Task>
  fetchSubtasks?: (taskId: string) => Promise<Task[]>
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('../../types').TaskDependency[]
    blockedBy: import('../../types').TaskDependency[]
  }>
  createTask?: (input: CreateTaskInput) => Promise<Task>
  onArchiveTask?: (task: Task) => void | Promise<void>
  onMarkDeletedTask?: (task: Task) => void | Promise<void>
  hideCompletedSubtasks?: boolean
  lineUpTaskIds: Set<string>
  onAddToLineUp?: (id: string) => void
  onRemoveFromLineUp?: (id: string) => void
  setTagsForTask: (taskId: string, tags: Tag[]) => Promise<void>
  searchTags: (query: string) => Promise<Tag[]>
  createTag: (name: string, color: TagColorId) => Promise<Tag>
  updateTag?: (tagId: string, updates: { name?: string; color?: TagColorId }) => Promise<Tag>
  deleteTagFromAllTasks?: (tagId: string) => Promise<void>
}

/**
 * Two-section tasks UI: rich lineup cards and collapsible backlog (habits live in notification bell).
 */
export function TasksBonsaiView({
  tasks,
  lineupTasks,
  backlogPool,
  loading,
  error,
  searchQuery,
  searchExpanded,
  onSearchQueryChange,
  onSearchExpandedChange,
  onOpenFilter,
  onAddTask,
  onOpenEdit,
  onShowDeleted,
  refetch,
  toggleComplete,
  fetchSubtasks,
  getTaskDependencies,
  createTask,
  onArchiveTask,
  onMarkDeletedTask,
  hideCompletedSubtasks = true,
  lineUpTaskIds,
  onAddToLineUp,
  onRemoveFromLineUp,
  setTagsForTask,
  searchTags,
  createTag,
  updateTag,
  deleteTagFromAllTasks,
}: TasksBonsaiViewProps) {
  const timeZone = useUserTimeZone()
  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 })

  const lineupIds = useMemo(
    () => new Set(lineupTasks.map((t) => t.id)),
    [lineupTasks],
  )

  const backlogPartition = useMemo(
    () => buildBacklogPartition(backlogPool, lineupIds, timeZone),
    [backlogPool, lineupIds, timeZone],
  )

  const enrichmentTasks = useMemo(() => {
    const ids = new Set<string>()
    for (const t of lineupTasks) ids.add(t.id)
    for (const t of backlogPartition.parentTasks) ids.add(t.id)
    for (const subs of backlogPartition.subtasksByParentId.values()) {
      for (const s of subs) ids.add(s.id)
    }
    return tasks.filter((t) => ids.has(t.id))
  }, [tasks, lineupTasks, backlogPartition])

  const { enrichmentById } = useTaskRowEnrichment({
    tasks: enrichmentTasks,
    allTasks: tasks,
    fetchSubtasks,
    getTaskDependencies,
  })

  const getEnrichment = useCallback(
    (taskId: string) => enrichmentById[taskId] ?? EMPTY_TASK_ENRICHMENT,
    [enrichmentById],
  )

  const handleContextMenu = (task: Task, e: MouseEvent) => {
    e.preventDefault()
    setContextTask(task)
    setContextPosition({ x: e.clientX, y: e.clientY })
  }

  const handleToggleComplete = async (task: Task) => {
    await toggleComplete(task.id, task.status !== 'completed')
    refetch?.()
  }

  const tagHandlers = {
    onTagsUpdated: refetch,
    setTagsForTask,
    searchTags,
    createTag,
    updateTag,
    deleteTagFromAllTasks,
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <TasksSectionHeader
        searchExpanded={searchExpanded}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchExpandedChange={onSearchExpandedChange}
        onOpenFilter={onOpenFilter}
        onAddTask={onAddTask}
      />

      {error ? (
        <p className="mb-4 text-body text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-secondary mb-6 text-on-surface-variant">Loading tasks…</p>
      ) : null}

      {/* Today's Lineup */}
      <section className="mb-16">
        <h2 className="text-secondary mb-4 font-bold uppercase tracking-wide text-on-surface-variant lg:hidden">
          Today&apos;s Lineup
        </h2>
        <div className="flex flex-col gap-3 lg:gap-3">
          {lineupTasks.length === 0 ? (
            <p className="text-secondary rounded-xl border border-dashed border-outline-variant/40 px-4 py-8 text-center text-on-surface-variant">
              No tasks due today or ready to work at medium priority and above.
            </p>
          ) : (
            lineupTasks.map((task) => (
              <LineupTaskCard
                key={task.id}
                task={task}
                enrichment={getEnrichment(task.id)}
                onOpen={() => onOpenEdit(task)}
                onContextMenu={(e) => handleContextMenu(task, e)}
                onToggleComplete={() => handleToggleComplete(task)}
                {...tagHandlers}
              />
            ))
          )}
        </div>
      </section>

      <OtherTasksSection
        partition={backlogPartition}
        getEnrichment={getEnrichment}
        hideCompletedSubtasks={hideCompletedSubtasks}
        onOpenTask={onOpenEdit}
        onContextMenu={handleContextMenu}
        onToggleComplete={handleToggleComplete}
      />

      {/* View deleted tasks footer */}
      <footer className="mt-20 flex justify-center border-t border-outline-variant/10 pt-8">
        <button
          type="button"
          onClick={onShowDeleted}
          className="text-secondary flex items-center gap-2 font-medium text-outline transition-colors hover:text-primary"
        >
          <MaterialIcon name="restore_from_trash" className="text-lg" />
          View Deleted Tasks
        </button>
      </footer>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={onAddTask}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform active:scale-95 lg:hidden"
        aria-label="Add new task"
      >
        <MaterialIcon name="add" className="text-3xl" />
      </button>

      {contextTask ? (
        <TaskContextPopover
          isOpen
          onClose={() => setContextTask(null)}
          x={contextPosition.x}
          y={contextPosition.y}
          task={contextTask}
          onRename={(t) => {
            setContextTask(null)
            onOpenEdit(t)
          }}
          onDuplicate={async (t) => {
            if (!createTask) return
            await createTask({
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
      ) : null}
    </div>
  )
}
