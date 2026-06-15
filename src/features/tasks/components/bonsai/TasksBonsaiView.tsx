/* TasksBonsaiView: Today's Lineup + Available / Unavailable backlog Bonsai layout */

import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { useGoals } from '../../../goals/hooks/useGoals'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { TaskContextPopover } from '../../modals/TaskContextPopover'
import { handleDesktopTaskContextMenu } from '../../utils/taskContextMenu'
import { useTaskRowEnrichment } from '../../hooks/useTaskRowEnrichment'
import type { CreateTaskInput, Task, Tag, TagColorId, UpdateTaskInput } from '../../types'
import { EMPTY_TASK_ENRICHMENT } from '../../types/taskRowEnrichment'
import { useUserTimeZone } from '../../../settings/useUserTimeZone'
import {
  buildBacklogPartition,
  splitBacklogPoolByAvailability,
} from '../../utils/partitionBonsaiTasks'
import { LineupTaskCard } from './LineupTaskCard'
import { BacklogTasksSection } from './OtherTasksSection'
import { TasksSectionHeader } from './TasksSectionHeader'
import { FilteredResultsHeader } from './FilteredResultsHeader'
import { SearchResultsHeader } from './SearchResultsHeader'
import { TasksMobileAddFab } from './TasksMobileAddFab'
import type { FilterSummaryChip } from '../../utils/filterSummary'

interface TasksBonsaiViewProps {
  tasks: Task[]
  /** Default layout: lineup + available / unavailable backlog */
  lineupTasks: Task[]
  backlogPool: Task[]
  blockedTaskIds: Set<string>
  /** When set, show search or filtered results instead of lineup/other */
  filterMode?: 'default' | 'filtered' | 'search'
  /** Tasks matching the active name search (sorted) */
  searchTasks?: Task[]
  /** Tasks matching applied custom filters (sorted) */
  filteredTasks?: Task[]
  onClearSearch?: () => void
  filterSummaryChips?: FilterSummaryChip[]
  onRemoveFilterChip?: (conditionId: string) => void
  onClearFilters?: () => void
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
  updateTask: (id: string, input: import('../../types').UpdateTaskInput) => Promise<Task>
  fetchSubtasks?: (taskId: string) => Promise<Task[]>
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('../../types').TaskDependency[]
    blockedBy: import('../../types').TaskDependency[]
  }>
  createTask?: (input: CreateTaskInput) => Promise<Task>
  onArchiveTask?: (task: Task) => void | Promise<void>
  onMarkDeletedTask?: (task: Task) => void | Promise<void>
  hideCompletedSubtasks?: boolean
  /** Increment to refetch checklist/subtask row metadata (e.g. after closing edit modal). */
  enrichmentRefreshKey?: number
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
 * Tasks UI: lineup cards plus collapsible Available and Unavailable backlog sections.
 */
export function TasksBonsaiView({
  tasks,
  lineupTasks,
  backlogPool,
  blockedTaskIds,
  filterMode = 'default',
  searchTasks = [],
  filteredTasks = [],
  onClearSearch,
  filterSummaryChips = [],
  onRemoveFilterChip,
  onClearFilters,
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
  updateTask,
  fetchSubtasks,
  getTaskDependencies,
  createTask,
  onArchiveTask,
  onMarkDeletedTask,
  hideCompletedSubtasks = true,
  enrichmentRefreshKey = 0,
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
  const { goals } = useGoals()
  const goalNameById = useMemo(
    () => new Map(goals.map((g) => [g.id, g.name])),
    [goals],
  )
  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 })

  const lineupIds = useMemo(
    () => new Set(lineupTasks.map((t) => t.id)),
    [lineupTasks],
  )

  /* Parent titles: label standalone subtask rows in backlog sections */
  const parentTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tasks) {
      map.set(t.id, t.title ?? '')
    }
    return map
  }, [tasks])

  /* Backlog split: blocked or future start → unavailable; same sort order preserved per bucket */
  const { availableBacklogPartition, unavailableBacklogPartition } = useMemo(() => {
    const { availablePool, unavailablePool } = splitBacklogPoolByAvailability(
      backlogPool,
      tasks,
      lineupIds,
      blockedTaskIds,
      timeZone,
    )
    return {
      availableBacklogPartition: buildBacklogPartition(availablePool, lineupIds, timeZone),
      unavailableBacklogPartition: buildBacklogPartition(unavailablePool, lineupIds, timeZone),
    }
  }, [backlogPool, tasks, lineupIds, blockedTaskIds, timeZone])

  const isSearchMode = filterMode === 'search'
  const isFilteredMode = filterMode === 'filtered'
  const isResultsListMode = isSearchMode || isFilteredMode
  const resultsListTasks = isSearchMode ? searchTasks : filteredTasks

  const enrichmentTasks = useMemo(() => {
    const ids = new Set<string>()
    if (isResultsListMode) {
      for (const t of resultsListTasks) ids.add(t.id)
    } else {
      for (const t of lineupTasks) ids.add(t.id)
      for (const partition of [availableBacklogPartition, unavailableBacklogPartition]) {
        for (const t of partition.parentTasks) ids.add(t.id)
        for (const subs of partition.subtasksByParentId.values()) {
          for (const s of subs) ids.add(s.id)
        }
      }
    }
    return tasks.filter((t) => ids.has(t.id))
  }, [
    tasks,
    lineupTasks,
    availableBacklogPartition,
    unavailableBacklogPartition,
    isResultsListMode,
    resultsListTasks,
  ])

  const { enrichmentById } = useTaskRowEnrichment({
    tasks: enrichmentTasks,
    allTasks: tasks,
    fetchSubtasks,
    getTaskDependencies,
    refreshKey: enrichmentRefreshKey,
  })

  const getEnrichment = useCallback(
    (taskId: string) => enrichmentById[taskId] ?? EMPTY_TASK_ENRICHMENT,
    [enrichmentById],
  )

  const handleContextMenu = (task: Task, e: MouseEvent) => {
    handleDesktopTaskContextMenu(e, ({ x, y }) => {
      setContextTask(task)
      setContextPosition({ x, y })
    })
  }

  const handleToggleComplete = async (task: Task) => {
    await toggleComplete(task.id, task.status !== 'completed')
    refetch?.()
  }

  /* Status updates: Match desktop/tablet behavior (complete uses toggleComplete; others use updateTask). */
  const handleUpdateStatus = async (taskId: string, status: import('../../types').TaskStatus) => {
    if (status === 'completed') {
      await toggleComplete(taskId, true)
    } else {
      await updateTask(taskId, { status })
    }
    refetch?.()
  }

  /* Priority and other field updates: shared handler for bonsai row controls */
  const handleUpdateTask = async (taskId: string, input: UpdateTaskInput) => {
    await updateTask(taskId, input)
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
    <div className="relative mx-auto w-full max-w-7xl pb-24 md:pb-0">
      {isSearchMode ? (
        <SearchResultsHeader
          taskCount={searchTasks.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onClearSearch={onClearSearch ?? (() => {})}
          onOpenFilter={onOpenFilter}
          onAddTask={onAddTask}
        />
      ) : isFilteredMode ? (
        <FilteredResultsHeader
          chips={filterSummaryChips}
          taskCount={filteredTasks.length}
          searchExpanded={searchExpanded}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onSearchExpandedChange={onSearchExpandedChange}
          onOpenFilter={onOpenFilter}
          onRemoveChip={onRemoveFilterChip ?? (() => {})}
          onClearFilters={onClearFilters ?? (() => {})}
          onAddTask={onAddTask}
        />
      ) : (
        <TasksSectionHeader
          searchExpanded={searchExpanded}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onSearchExpandedChange={onSearchExpandedChange}
          onOpenFilter={onOpenFilter}
          onAddTask={onAddTask}
        />
      )}

      {error ? (
        <p className="mb-4 text-body text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-secondary mb-6 text-on-surface-variant">Loading tasks…</p>
      ) : null}

      {isResultsListMode ? (
        <section className="mb-16">
          <div className="flex flex-col gap-4">
            {resultsListTasks.length === 0 ? (
              <p className="text-secondary rounded-xl border border-dashed border-outline-variant/40 px-4 py-8 text-center text-on-surface-variant">
                {isSearchMode ? 'No tasks match your search.' : 'No tasks match your filters.'}
              </p>
            ) : (
              resultsListTasks.map((task) => (
                <LineupTaskCard
                  key={task.id}
                  task={task}
                  enrichment={getEnrichment(task.id)}
                  goalName={task.goal_id ? goalNameById.get(task.goal_id) ?? null : null}
                  onOpen={() => onOpenEdit(task)}
                  onContextMenu={(e) => handleContextMenu(task, e)}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateTask={handleUpdateTask}
                  {...tagHandlers}
                />
              ))
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="mb-16">
            <h2 className="text-secondary mb-4 font-bold uppercase tracking-wide text-on-surface-variant md:hidden">
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
                    goalName={task.goal_id ? goalNameById.get(task.goal_id) ?? null : null}
                    onOpen={() => onOpenEdit(task)}
                    onContextMenu={(e) => handleContextMenu(task, e)}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateTask={handleUpdateTask}
                    {...tagHandlers}
                  />
                ))
              )}
            </div>
          </section>

          <BacklogTasksSection
            title="Available tasks"
            partition={availableBacklogPartition}
            getEnrichment={getEnrichment}
            parentTitleById={parentTitleById}
            hideCompletedSubtasks={hideCompletedSubtasks}
            onOpenTask={onOpenEdit}
            onContextMenu={handleContextMenu}
            onToggleComplete={handleToggleComplete}
            onUpdateStatus={handleUpdateStatus}
            onUpdateTask={handleUpdateTask}
            defaultOpen={false}
          />

          <div className="mt-10">
            <BacklogTasksSection
              title="Unavailable tasks"
              partition={unavailableBacklogPartition}
              getEnrichment={getEnrichment}
              parentTitleById={parentTitleById}
              hideCompletedSubtasks={hideCompletedSubtasks}
              onOpenTask={onOpenEdit}
              onContextMenu={handleContextMenu}
              onToggleComplete={handleToggleComplete}
              onUpdateStatus={handleUpdateStatus}
              onUpdateTask={handleUpdateTask}
              defaultOpen={false}
            />
          </div>
        </>
      )}

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

      <TasksMobileAddFab onAddTask={onAddTask} />

      {contextTask ? (
        <TaskContextPopover
          isOpen
          onClose={() => setContextTask(null)}
          x={contextPosition.x}
          y={contextPosition.y}
          task={contextTask}
          onOpenTask={(t) => {
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
          displayedLineupTaskIds={lineupIds}
          onAddToLineUp={onAddToLineUp}
          onRemoveFromLineUp={onRemoveFromLineUp}
        />
      ) : null}
    </div>
  )
}
