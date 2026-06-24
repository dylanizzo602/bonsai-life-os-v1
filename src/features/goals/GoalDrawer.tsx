/* GoalDrawer: right-side overlay drawer for goal detail and inline editing */
import { useState, useCallback, useEffect } from 'react'
import { useGoal } from './hooks/useGoals'
import { useTasks } from '../tasks/hooks/useTasks'
import { getTaskTreesByMilestoneId, getGoal } from '../../lib/supabase/goals'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import { GoalDrawerHeader } from './components/drawer/GoalDrawerHeader'
import { GoalDrawerMetadataBar } from './components/drawer/GoalDrawerMetadataBar'
import { GoalDrawerDescription } from './components/drawer/GoalDrawerDescription'
import { GoalMilestoneTimeline } from './components/drawer/GoalMilestoneTimeline'
import { GoalDrawerHabits } from './components/drawer/GoalDrawerHabits'
import { GoalDrawerHistory } from './components/drawer/GoalDrawerHistory'
import { GoalDrawerFooter } from './components/drawer/GoalDrawerFooter'
import type { Task } from '../tasks/types'
import type { Goal, UpdateGoalInput } from './types'

export interface GoalDrawerProps {
  goalId: string
  onClose: () => void
  onDeleted?: () => void
  /** Sync goal field edits back to the goals list (e.g. icon, name) */
  onGoalUpdated?: (goal: Goal) => void
  /** Called when progress crosses from below 100% to complete */
  onGoalProgressChange?: (
    goal: Pick<Goal, 'id' | 'name'>,
    previousProgress: number,
    nextProgress: number,
  ) => void
}

/**
 * Material goal detail drawer: backdrop + slide-in panel with editable fields.
 */
export function GoalDrawer({
  goalId,
  onClose,
  onDeleted,
  onGoalUpdated,
  onGoalProgressChange,
}: GoalDrawerProps) {
  const {
    goal,
    loading,
    error,
    refetch,
    createMilestone,
    updateMilestone,
    linkHabit,
    unlinkHabit,
    history,
    historyLoading,
    updateGoal,
    deleteGoal,
    recalculateProgress,
  } = useGoal(goalId)

  const {
    getTasks,
    updateTask,
    deleteTask,
    toggleComplete,
    fetchSubtasks,
    createSubtask,
    getTaskDependencies,
    onAddDependency,
    onRemoveDependency,
    createTask,
  } = useTasks()

  const [taskTreesByMilestoneId, setTaskTreesByMilestoneId] = useState<Record<string, Task[]>>({})
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [visible, setVisible] = useState(false)

  /* Enter animation on mount */
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  /* Body scroll lock while drawer is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  /* ESC closes drawer */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  /* Fetch task trees for milestone progress display */
  useEffect(() => {
    const milestones = goal?.milestones ?? []
    let cancelled = false

    void (async () => {
      const trees =
        milestones.length === 0 ? {} : await getTaskTreesByMilestoneId(milestones)
      if (!cancelled) setTaskTreesByMilestoneId(trees)
    })()

    return () => {
      cancelled = true
    }
  }, [goal?.milestones])

  const wrappedUpdateGoal = useCallback(
    async (id: string, input: UpdateGoalInput) => {
      const updated = await updateGoal(id, input)
      onGoalUpdated?.(updated)
      return updated
    },
    [updateGoal, onGoalUpdated],
  )

  /* Notify parent when progress may have crossed 100% after a mutation */
  const notifyProgressChange = useCallback(
    async (previousProgress: number) => {
      if (!onGoalProgressChange) return
      const fresh = await getGoal(goalId)
      if (!fresh) return
      onGoalProgressChange(
        { id: fresh.id, name: fresh.name },
        previousProgress,
        fresh.computed_progress,
      )
    },
    [goalId, onGoalProgressChange],
  )

  const wrappedUpdateMilestone = useCallback(
    async (id: string, input: Parameters<typeof updateMilestone>[1]) => {
      const previousProgress = goal?.computed_progress ?? 0
      const result = await updateMilestone(id, input)
      await notifyProgressChange(previousProgress)
      return result
    },
    [goal?.computed_progress, updateMilestone, notifyProgressChange],
  )

  const wrappedCreateMilestone = useCallback(
    async (input: Parameters<typeof createMilestone>[0]) => {
      const previousProgress = goal?.computed_progress ?? 0
      const result = await createMilestone(input)
      await notifyProgressChange(previousProgress)
      return result
    },
    [goal?.computed_progress, createMilestone, notifyProgressChange],
  )

  const syncMilestoneForTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!goal) return
      const milestone = goal.milestones.find(
        (m) =>
          m.type === 'task' &&
          (m.linked_tasks?.some((t) => t.id === taskId) ?? false),
      )
      if (milestone) await updateMilestone(milestone.id, { completed })
    },
    [goal, updateMilestone],
  )

  const wrappedUpdateTask = useCallback(
    async (id: string, input: Parameters<typeof updateTask>[1]) => {
      const previousProgress = goal?.computed_progress ?? 0
      const t = await updateTask(id, input)
      await syncMilestoneForTask(id, t.status === 'completed')
      await recalculateProgress()
      await notifyProgressChange(previousProgress)
      return t
    },
    [goal?.computed_progress, updateTask, syncMilestoneForTask, recalculateProgress, notifyProgressChange],
  )

  const wrappedToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const previousProgress = goal?.computed_progress ?? 0
      const t = await toggleComplete(id, completed)
      await syncMilestoneForTask(id, completed)
      await recalculateProgress()
      await notifyProgressChange(previousProgress)
      return t
    },
    [goal?.computed_progress, toggleComplete, syncMilestoneForTask, recalculateProgress, notifyProgressChange],
  )

  const handleDelete = async () => {
    await deleteGoal(goalId)
    onDeleted?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Goal details">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-on-surface/10 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close goal drawer"
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 flex h-full w-full max-w-lg flex-col bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {loading && (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-body text-on-surface-variant">Loading goal…</p>
          </div>
        )}

        {!loading && (error || !goal) && (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 p-8">
            <p className="text-body text-error" role="alert">
              {error || 'Goal not found'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-body font-medium text-primary hover:underline"
            >
              Close
            </button>
          </div>
        )}

        {!loading && goal && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
              <GoalDrawerHeader
                goal={goal}
                progressPercent={goal.computed_progress}
                onClose={onClose}
                updateGoal={wrappedUpdateGoal}
              />

              <div className="flex flex-col gap-8 px-8 py-6">
                <GoalDrawerMetadataBar goal={goal} updateGoal={wrappedUpdateGoal} />
                <GoalDrawerDescription goal={goal} updateGoal={wrappedUpdateGoal} />
                <GoalMilestoneTimeline
                  goalId={goal.id}
                  milestones={goal.milestones}
                  taskTreesByMilestoneId={taskTreesByMilestoneId}
                  onCreateMilestone={wrappedCreateMilestone}
                  onUpdateMilestone={wrappedUpdateMilestone}
                  getTasks={async () => {
                    const tasks = await getTasks()
                    return tasks.map((t) => ({ id: t.id, title: t.title }))
                  }}
                  onOpenEditTaskModal={(task) => setTaskToEdit(task)}
                />
                <GoalDrawerHabits
                  linkedHabits={goal.linked_habits}
                  onLinkHabit={linkHabit}
                  onUnlinkHabit={unlinkHabit}
                />
                <GoalDrawerHistory history={history} loading={historyLoading} />
              </div>
            </div>

            <GoalDrawerFooter onDelete={handleDelete} />
          </>
        )}
      </div>

      {/* Task edit modal for task-type milestones */}
      <AddEditTaskModal
        isOpen={!!taskToEdit}
        onClose={() => {
          setTaskToEdit(null)
          void refetch()
        }}
        onCreateTask={createTask}
        onCreatedTask={(task) => setTaskToEdit(task)}
        task={taskToEdit}
        onUpdateTask={wrappedUpdateTask}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        updateTask={wrappedUpdateTask}
        deleteTask={deleteTask}
        toggleComplete={wrappedToggleComplete}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
      />
    </div>
  )
}
