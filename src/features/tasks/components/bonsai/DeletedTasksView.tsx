/* DeletedTasksView: Full-page deleted tasks list with restore and empty trash */

import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { useGoals } from '../../../goals/hooks/useGoals'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { Button } from '../../../../components/Button'
import { Modal } from '../../../../components/Modal'
import { TaskContextPopover } from '../../modals/TaskContextPopover'
import { handleDesktopTaskContextMenu } from '../../utils/taskContextMenu'
import { useTaskRowEnrichment } from '../../hooks/useTaskRowEnrichment'
import type { CreateTaskInput, Task } from '../../types'
import { EMPTY_TASK_ENRICHMENT } from '../../types/taskRowEnrichment'
import { DeletedTaskCard } from './DeletedTaskCard'

interface DeletedTasksViewProps {
  tasks: Task[]
  allTasks: Task[]
  loading?: boolean
  error?: string | null
  onBack: () => void
  onOpenEdit: (task: Task) => void
  onRestoreTask: (task: Task) => void | Promise<void>
  onEmptyDeleted: () => void | Promise<void>
  refetch?: () => void
  fetchSubtasks?: (taskId: string) => Promise<Task[]>
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('../../types').TaskDependency[]
    blockedBy: import('../../types').TaskDependency[]
  }>
  createTask?: (input: CreateTaskInput) => Promise<Task>
  onArchiveTask?: (task: Task) => void | Promise<void>
  onMarkDeletedTask?: (task: Task) => void | Promise<void>
  lineUpTaskIds: Set<string>
  onAddToLineUp?: (id: string) => void
  onRemoveFromLineUp?: (id: string) => void
}

/**
 * Deleted tasks screen: back + empty trash, retention warning, lineup-style cards with restore on hover.
 */
export function DeletedTasksView({
  tasks,
  allTasks,
  loading,
  error,
  onBack,
  onOpenEdit,
  onRestoreTask,
  onEmptyDeleted,
  refetch,
  fetchSubtasks,
  getTaskDependencies,
  createTask,
  onArchiveTask,
  onMarkDeletedTask,
  lineUpTaskIds,
  onAddToLineUp,
  onRemoveFromLineUp,
}: DeletedTasksViewProps) {
  const { goals } = useGoals()
  const goalNameById = useMemo(
    () => new Map(goals.map((g) => [g.id, g.name])),
    [goals],
  )

  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 })
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false)
  const [emptying, setEmptying] = useState(false)

  const { enrichmentById } = useTaskRowEnrichment({
    tasks,
    allTasks,
    fetchSubtasks,
    getTaskDependencies,
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

  const handleConfirmEmpty = async () => {
    setEmptying(true)
    try {
      await onEmptyDeleted()
      setEmptyConfirmOpen(false)
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-7xl pb-16">
      {/* Top bar: back and empty deleted */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-body inline-flex items-center gap-2 font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <MaterialIcon name="arrow_back" className="text-xl" />
          Back
        </button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={tasks.length === 0 || emptying}
          onClick={() => setEmptyConfirmOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <MaterialIcon name="delete_forever" className="text-lg" />
          Empty Deleted
        </Button>
      </div>

      {/* Page title and count */}
      <header className="mb-4">
        <h1 className="text-page-title font-semibold tracking-tight text-on-surface">
          Deleted tasks
        </h1>
        <p className="text-secondary mt-1 font-bold uppercase tracking-wide text-on-surface-variant">
          {tasks.length} {tasks.length === 1 ? 'TASK' : 'TASKS'}
        </p>
      </header>

      {/* Retention warning */}
      <p
        className="text-secondary mb-8 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-900"
        role="status"
      >
        Tasks in here are permanently deleted 30 days after they are marked as deleted.
      </p>

      {error ? (
        <p className="mb-4 text-body text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-secondary mb-6 text-on-surface-variant">Loading deleted tasks…</p>
      ) : null}

      {/* Deleted task list */}
      <section className="mb-16">
        <div className="flex flex-col gap-4">
          {!loading && tasks.length === 0 ? (
            <p className="text-secondary rounded-xl border border-dashed border-outline-variant/40 px-4 py-8 text-center text-on-surface-variant">
              No deleted tasks.
            </p>
          ) : (
            tasks.map((task) => (
              <DeletedTaskCard
                key={task.id}
                task={task}
                enrichment={getEnrichment(task.id)}
                goalName={task.goal_id ? goalNameById.get(task.goal_id) ?? null : null}
                onOpen={() => onOpenEdit(task)}
                onContextMenu={(e) => handleContextMenu(task, e)}
                onRestore={() => onRestoreTask(task)}
              />
            ))
          )}
        </div>
      </section>

      {/* Confirm empty deleted */}
      <Modal
        isOpen={emptyConfirmOpen}
        onClose={() => !emptying && setEmptyConfirmOpen(false)}
        title="Empty deleted tasks?"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setEmptyConfirmOpen(false)}
              disabled={emptying}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmEmpty} disabled={emptying}>
              {emptying ? 'Deleting…' : 'Empty Deleted'}
            </Button>
          </div>
        }
      >
        <p className="text-body text-bonsai-slate-700">
          Permanently delete {tasks.length} task{tasks.length === 1 ? '' : 's'}? This cannot be
          undone.
        </p>
      </Modal>

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
          onAddToLineUp={onAddToLineUp}
          onRemoveFromLineUp={onRemoveFromLineUp}
        />
      ) : null}
    </div>
  )
}
