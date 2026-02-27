/* Weekly briefing page: 3-step flow – look back, goals progress, task cleanup */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTasks as getTasksFromApi } from '../../lib/supabase/tasks'
import { getMilestonesForGoal } from '../../lib/supabase/goals'
import { useTasks } from '../tasks/hooks/useTasks'
import { useHabits } from '../habits/hooks/useHabits'
import { useGoals } from '../goals/hooks/useGoals'
import { BriefingProgressBar } from '../briefings/BriefingProgressBar'
import { GoalDetailPage } from '../goals/GoalDetailPage'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import { LookBackScreen } from './LookBackScreen'
import { GoalsProgressScreen } from './GoalsProgressScreen'
import { TaskCleanupScreen } from './TaskCleanupScreen'
import type { GoalMilestone } from '../goals/types'
import type { Task } from '../tasks/types'

/** Number of steps in the weekly briefing flow (look back, goals, tasks) */
const TOTAL_STEPS = 3

/**
 * Weekly briefing: look back on last week, review goals progress, then clean up tasks with no date/priority.
 * Uses step state and BriefingProgressBar; goal detail and task edit open in-context.
 */
export function WeeklyBriefingPage() {
  /* Step state: 0 = look back, 1 = goals progress, 2 = task cleanup, 3 = complete */
  const [step, setStep] = useState(0)
  /* When set, show GoalDetailPage in-context (overlay); onBack clears */
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  /* When set, show AddEditTaskModal for task cleanup step */
  const [editTask, setEditTask] = useState<Task | null>(null)
  /* Tasks completed in last 7 days (fetched separately with date range) */
  const [tasksCompletedLastWeek, setTasksCompletedLastWeek] = useState(0)
  const [tasksCompletedLoading, setTasksCompletedLoading] = useState(true)

  /* Data: tasks (top-level), habits with streaks, goals */
  const {
    tasks,
    refetch: refetchTasks,
    updateTask,
    deleteTask,
    getTasks,
    getTaskDependencies,
    onAddDependency,
    onRemoveDependency,
    fetchSubtasks,
    createSubtask,
    toggleComplete,
  } = useTasks()
  const { habitsWithStreaks } = useHabits()
  const { goals, refetch: refetchGoals } = useGoals()
  const [milestonesByGoal, setMilestonesByGoal] = useState<Record<string, GoalMilestone[]>>({})

  /* Fetch tasks completed in last 7 days for look-back step */
  useEffect(() => {
    const now = new Date()
    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    from.setHours(0, 0, 0, 0)
    const completedAtFrom = from.toISOString()
    const completedAtTo = to.toISOString()

    setTasksCompletedLoading(true)
    getTasksFromApi({ status: 'completed', parent_id: null, completedAtFrom, completedAtTo })
      .then((list) => setTasksCompletedLastWeek(list.length))
      .catch(() => setTasksCompletedLastWeek(0))
      .finally(() => setTasksCompletedLoading(false))
  }, [])

  /* Fetch milestones for all goals (for goals step display) */
  useEffect(() => {
    if (goals.length === 0) {
      setMilestonesByGoal({})
      return
    }
    const fetchMilestones = async () => {
      const map: Record<string, GoalMilestone[]> = {}
      for (const goal of goals) {
        try {
          const milestones = await getMilestonesForGoal(goal.id)
          map[goal.id] = milestones
        } catch {
          map[goal.id] = []
        }
      }
      setMilestonesByGoal(map)
    }
    fetchMilestones()
  }, [goals])

  /* Tasks that need review: active/in_progress, no due date or no priority */
  const tasksToReview = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.status === 'active' || t.status === 'in_progress') &&
          (t.due_date == null || t.priority === 'none')
      ),
    [tasks]
  )

  /* When showing goal detail in-context, render GoalDetailPage overlay */
  if (selectedGoalId) {
    return (
      <div className="min-h-full">
        <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Weekly Briefing</h1>
        <GoalDetailPage
          goalId={selectedGoalId}
          onBack={() => {
            setSelectedGoalId(null)
            refetchGoals()
          }}
        />
      </div>
    )
  }

  /* Completion view: step 3 */
  if (step === 3) {
    return (
      <div className="min-h-full">
        <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Weekly Briefing</h1>
        <div className="flex min-h-[40vh] flex-col justify-center">
          <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
            Weekly briefing complete.
          </h2>
          <p className="text-body text-bonsai-slate-700 mb-6">
            You&apos;ve looked back on last week, reviewed goals, and cleaned up tasks. Have a great week.
          </p>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="rounded-lg bg-bonsai-sage-600 px-4 py-2 text-body font-medium text-white hover:bg-bonsai-sage-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:ring-offset-2"
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  /* Main flow: steps 0, 1, 2 with progress bar */
  return (
    <div className="min-h-full flex flex-col">
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Weekly Briefing</h1>

      {step === 0 && (
        <LookBackScreen
          tasksCompletedLastWeek={tasksCompletedLastWeek}
          habitsWithStreaks={habitsWithStreaks}
          loading={tasksCompletedLoading}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <GoalsProgressScreen
          goals={goals}
          milestonesByGoal={milestonesByGoal}
          onUpdateProgress={setSelectedGoalId}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <TaskCleanupScreen
          tasksToReview={tasksToReview}
          onEditTask={setEditTask}
          onArchiveTask={useCallback(
            (task: Task) => {
              updateTask(task.id, { status: 'archived' }).then(() => refetchTasks())
            },
            [updateTask, refetchTasks]
          )}
          onDeleteTask={useCallback(
            (task: Task) => {
              deleteTask(task.id).then(() => refetchTasks())
            },
            [deleteTask, refetchTasks]
          )}
          onFinish={() => setStep(3)}
        />
      )}

      {/* Progress bar: 1-based step of 3 (hidden on completion) */}
      <BriefingProgressBar currentStep={step + 1} totalSteps={TOTAL_STEPS} />

      {/* Task edit modal for cleanup step */}
      <AddEditTaskModal
        isOpen={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onUpdateTask={async (id, input) => {
          const updated = await updateTask(id, input)
          refetchTasks()
          return updated
        }}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        updateTask={updateTask}
        deleteTask={deleteTask}
        toggleComplete={toggleComplete}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
      />
    </div>
  )
}
