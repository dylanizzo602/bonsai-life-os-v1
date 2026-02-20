/* GoalDetailPage component: Goal detail view with milestones, habits, and history */
import { Button } from '../../components/Button'
import { ChevronLeftIcon } from '../../components/icons'
import { useGoal } from './hooks/useGoals'
import { GoalGauge } from './GoalGauge'
import { MilestoneList } from './MilestoneList'
import { HabitLinkSection } from './HabitLinkSection'
import { GoalHistorySection } from './GoalHistorySection'
import { AddEditGoalModal } from './AddEditGoalModal'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import { TaskContextPopover } from '../tasks/modals/TaskContextPopover'
import { useTasks } from '../tasks/hooks/useTasks'
import type { Task } from '../tasks/types'
import { useState, useCallback, useRef, useEffect } from 'react'

interface GoalDetailPageProps {
  /** Goal ID to display */
  goalId: string
  /** Back navigation handler */
  onBack: () => void
}

/**
 * Goal detail page component.
 * Displays goal with gauge, milestones, linked habits, and history.
 */
export function GoalDetailPage({ goalId, onBack }: GoalDetailPageProps) {
  const {
    goal,
    loading,
    error,
    refetch,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    linkHabit,
    unlinkHabit,
    history,
    historyLoading,
    updateGoal,
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

  /* Edit goal modal state */
  const [editModalOpen, setEditModalOpen] = useState(false)
  /* Task edit modal: when set, open AddEditTaskModal for this task (linked from a milestone) */
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  /* Task context menu: right-click on linked task shows Rename, Duplicate, Archive, Delete */
  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 })
  /* Debug H7/H8: ref to measure success root and scroll parent */
  const successRootRef = useRef<HTMLDivElement>(null)

  /* Debug H7/H8: when success UI is shown, log dimensions and scroll position; scroll scrollable parent to top */
  useEffect(() => {
    if (!goal || loading) return
    const el = successRootRef.current
    if (!el) return
    let p: HTMLElement | null = el.parentElement
    while (p) {
      const style = getComputedStyle(p)
      const overflow = style.overflow + style.overflowY
      if (overflow.includes('auto') || overflow.includes('scroll')) {
        const scrollTopBefore = p.scrollTop
        p.scrollTo(0, 0)
        const rootRect = el.getBoundingClientRect()
        fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'GoalDetailPage.tsx:useEffect',message:'success layout',data:{rootHeight:rootRect.height,rootWidth:rootRect.width,scrollTopBefore,scrollHeight:p.scrollHeight,clientHeight:p.clientHeight},timestamp:Date.now(),hypothesisId:'H7'})}).catch(()=>{});
        break
      }
      p = p.parentElement
    }
  }, [goal, loading])

  /* Sync milestone completion when linked task is completed/uncompleted */
  const syncMilestoneForTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!goal) return
      const milestone = goal.milestones.find(
        (m) => m.type === 'task' && m.task_id === taskId
      )
      if (milestone) await updateMilestone(milestone.id, { completed })
    },
    [goal, updateMilestone]
  )

  /* Wrapped task update: sync milestone completion and refetch goal */
  const wrappedUpdateTask = useCallback(
    async (id: string, input: Parameters<typeof updateTask>[1]) => {
      const t = await updateTask(id, input)
      await syncMilestoneForTask(id, t.status === 'completed')
      refetch()
      return t
    },
    [updateTask, syncMilestoneForTask, refetch]
  )

  /* Wrapped toggle complete: sync milestone completion and refetch goal */
  const wrappedToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const t = await toggleComplete(id, completed)
      await syncMilestoneForTask(id, completed)
      refetch()
      return t
    },
    [toggleComplete, syncMilestoneForTask, refetch]
  )

  /* Format dates for display */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  /* Debug: which branch GoalDetailPage renders (loading / error / success) */
  // #region agent log
  const branch = loading ? 'loading' : (error || !goal) ? 'error' : 'success'
  fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'GoalDetailPage.tsx:render',message:'detail branch',data:{goalId,loading,error:error||null,hasGoal:!!goal,goalName:goal?.name,branch},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
  // #endregion

  if (loading) {
    return (
      <div className="min-h-full">
        <p className="text-body text-bonsai-slate-500 py-8">Loading goal…</p>
      </div>
    )
  }

  if (error || !goal) {
    return (
      <div className="min-h-full">
        <p className="text-body text-red-600 py-2" role="alert">
          {error || 'Goal not found'}
        </p>
        <Button variant="secondary" onClick={onBack}>
          Back to Goals
        </Button>
      </div>
    )
  }

  /* Success branch: root fills and scrolls with main content wrapper */
  return (
    <div ref={successRootRef} className="min-h-full">
      {/* Header: back button and title */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="text-bonsai-slate-600 hover:text-bonsai-slate-800"
          aria-label="Back to goals"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-page-title font-bold text-bonsai-brown-700">{goal.name}</h1>
          {goal.description && (
            <p className="text-body text-bonsai-slate-600 mt-1">{goal.description}</p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
          Edit Goal
        </Button>
      </div>

      {/* Goal overview: gauge, dates, progress */}
      <div className="bg-white border border-bonsai-slate-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Gauge */}
          <div className="shrink-0">
            <GoalGauge progress={goal.computed_progress} size={150}>
              <div className="text-center">
                <div className="text-2xl font-bold text-bonsai-brown-700">
                  {goal.computed_progress}%
                </div>
                <div className="text-secondary text-bonsai-slate-600 text-xs mt-1">
                  Progress
                </div>
              </div>
            </GoalGauge>
          </div>

          {/* Dates and progress controls */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-secondary text-bonsai-slate-600 mb-1">Start Date</p>
                <p className="text-body font-medium text-bonsai-brown-700">
                  {formatDate(goal.start_date)}
                </p>
              </div>
              <div>
                <p className="text-secondary text-bonsai-slate-600 mb-1">Target Date</p>
                <p className="text-body font-medium text-bonsai-brown-700">
                  {formatDate(goal.target_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections: milestones, habits, history */}
      <div className="space-y-8">
        {/* Milestones section */}
        <MilestoneList
          goalId={goal.id}
          milestones={goal.milestones}
          onCreateMilestone={createMilestone}
          onUpdateMilestone={updateMilestone}
          onDeleteMilestone={deleteMilestone}
          getTasks={async () => {
            const tasks = await getTasks()
            return tasks.map((t) => ({ id: t.id, title: t.title }))
          }}
          onTaskUpdated={refetch}
          onOpenEditTaskModal={(task) => setTaskToEdit(task)}
          onOpenTaskContextMenu={(task, x, y) => {
            setContextTask(task)
            setContextPosition({ x, y })
          }}
        />

        {/* Linked habits section */}
        <HabitLinkSection
          goalId={goal.id}
          linkedHabits={goal.linked_habits}
          onLinkHabit={linkHabit}
          onUnlinkHabit={unlinkHabit}
        />

        {/* History section */}
        <GoalHistorySection history={history} loading={historyLoading} />
      </div>

      {/* Edit goal modal */}
      <AddEditGoalModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdateGoal={updateGoal}
        goal={goal}
      />

      {/* Task edit modal: open when user clicks linked task in a milestone */}
      <AddEditTaskModal
        isOpen={!!taskToEdit}
        onClose={() => {
          setTaskToEdit(null)
          refetch()
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

      {/* Task context popover: right-click on linked task shows Rename, Duplicate, Archive, Delete */}
      {contextTask && (
        <TaskContextPopover
          isOpen
          onClose={() => setContextTask(null)}
          x={contextPosition.x}
          y={contextPosition.y}
          task={contextTask}
          onRename={(t) => {
            setContextTask(null)
            setTaskToEdit(t)
          }}
          onDuplicate={async (t) => {
            await createTask({
              title: `${t.title} (copy)`,
              description: t.description ?? undefined,
              start_date: t.start_date ?? undefined,
              due_date: t.due_date ?? undefined,
              priority: t.priority,
              time_estimate: t.time_estimate ?? undefined,
              status: 'active',
            })
            refetch()
          }}
          onArchive={async (task) => {
            await wrappedUpdateTask(
              task.id,
              task.status === 'archived' ? { status: 'active' } : { status: 'archived' }
            )
            setContextTask(null)
          }}
          onMarkDeleted={async (task) => {
            await wrappedUpdateTask(task.id, { status: 'deleted' })
            setContextTask(null)
          }}
        />
      )}
    </div>
  )
}
