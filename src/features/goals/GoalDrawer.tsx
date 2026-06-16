/* GoalDrawer: right-side overlay drawer for goal detail and inline editing */
import { useState, useCallback, useEffect } from 'react'
import { useGoal } from './hooks/useGoals'
import { useTasks } from '../tasks/hooks/useTasks'
import { getTaskTreesByMilestoneId } from '../../lib/supabase/goals'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import { GoalDrawerHeader } from './components/drawer/GoalDrawerHeader'
import { GoalDrawerMetadataBar } from './components/drawer/GoalDrawerMetadataBar'
import { GoalDrawerDescription } from './components/drawer/GoalDrawerDescription'
import { GoalMilestoneTimeline } from './components/drawer/GoalMilestoneTimeline'
import { GoalDrawerHabits } from './components/drawer/GoalDrawerHabits'
import { GoalDrawerHistory } from './components/drawer/GoalDrawerHistory'
import { GoalDrawerFooter } from './components/drawer/GoalDrawerFooter'
import type { Task } from '../tasks/types'

export interface GoalDrawerProps {
  goalId: string
  onClose: () => void
  onDeleted?: () => void
}

/**
 * Material goal detail drawer: backdrop + slide-in panel with editable fields.
 */
export function GoalDrawer({ goalId, onClose, onDeleted }: GoalDrawerProps) {
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

  const syncMilestoneForTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!goal) return
      const milestone = goal.milestones.find((m) => m.type === 'task' && m.task_id === taskId)
      if (milestone) await updateMilestone(milestone.id, { completed })
    },
    [goal, updateMilestone],
  )

  const wrappedUpdateTask = useCallback(
    async (id: string, input: Parameters<typeof updateTask>[1]) => {
      const t = await updateTask(id, input)
      await syncMilestoneForTask(id, t.status === 'completed')
      await recalculateProgress()
      return t
    },
    [updateTask, syncMilestoneForTask, recalculateProgress],
  )

  const wrappedToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const t = await toggleComplete(id, completed)
      await syncMilestoneForTask(id, completed)
      await recalculateProgress()
      return t
    },
    [toggleComplete, syncMilestoneForTask, recalculateProgress],
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
                updateGoal={updateGoal}
              />

              <div className="flex flex-col gap-8 px-8 py-6">
                <GoalDrawerMetadataBar goal={goal} updateGoal={updateGoal} />
                <GoalDrawerDescription goal={goal} updateGoal={updateGoal} />
                <GoalMilestoneTimeline
                  goalId={goal.id}
                  milestones={goal.milestones}
                  taskTreesByMilestoneId={taskTreesByMilestoneId}
                  onCreateMilestone={createMilestone}
                  onUpdateMilestone={updateMilestone}
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
