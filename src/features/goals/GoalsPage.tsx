/* Goals page: Responsive grid of goal gauge cards with create goal button */
import { useState, useEffect } from 'react'
import { AddButton } from '../../components/AddButton'
import { GoalsIcon, PlusIcon } from '../../components/icons'
import { useGoals } from './hooks/useGoals'
import { GoalGaugeCard } from './GoalGaugeCard'
import { GoalDetailPage } from './GoalDetailPage'
import { AddEditGoalModal } from './AddEditGoalModal'
import { getMilestonesForGoal } from '../../lib/supabase/goals'
import type { Goal, GoalMilestone } from './types'

/**
 * Goals page component.
 * Displays goals in a responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop).
 * Clicking a goal navigates to goal detail page.
 */
export function GoalsPage() {
  const { goals, loading, error, createGoal, updateGoal, deleteGoal, refetch } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [milestonesByGoal, setMilestonesByGoal] = useState<Record<string, GoalMilestone[]>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  /* Fetch milestones for all goals */
  useEffect(() => {
    const fetchMilestones = async () => {
      const milestonesMap: Record<string, GoalMilestone[]> = {}
      for (const goal of goals) {
        try {
          const milestones = await getMilestonesForGoal(goal.id)
          milestonesMap[goal.id] = milestones
        } catch (err) {
          console.error(`Error fetching milestones for goal ${goal.id}:`, err)
          milestonesMap[goal.id] = []
        }
      }
      setMilestonesByGoal(milestonesMap)
    }

    if (goals.length > 0) {
      fetchMilestones()
    }
  }, [goals])

  /* Handle goal card click: navigate to detail page */
  const handleGoalClick = (goalId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'GoalsPage.tsx:handleGoalClick',message:'goal click',data:{goalId},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    setSelectedGoalId(goalId)
  }

  /* Handle back from detail page */
  const handleBack = () => {
    setSelectedGoalId(null)
    refetch()
  }

  /* Handle create goal button */
  const handleOpenCreate = () => {
    setEditingGoal(null)
    setModalOpen(true)
  }

  /* Handle edit goal */
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setModalOpen(true)
  }

  /* Handle close modal */
  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingGoal(null)
  }

  /* If a goal is selected, show detail page (key forces fresh mount when goal changes) */
  if (selectedGoalId) {
    // #region agent log
    fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'GoalsPage.tsx:render',message:'rendering GoalDetailPage',data:{selectedGoalId},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return (
      <GoalDetailPage
        key={selectedGoalId}
        goalId={selectedGoalId}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="min-h-full">
      {/* Header: title and Create Goal button */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4 mb-6">
        <div>
          <h1 className="text-page-title font-bold text-bonsai-brown-700">Goals</h1>
          <p className="text-secondary text-bonsai-slate-600 mt-1">
            Track your progress toward meaningful objectives with milestones and habit integration.
          </p>
        </div>
        <div className="shrink-0">
          <AddButton onClick={handleOpenCreate} hideChevron>Create Goal</AddButton>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <p className="text-body text-bonsai-slate-500 py-8">Loading goals…</p>
      )}

      {/* Error state */}
      {error && (
        <p className="text-body text-red-600 py-2" role="alert">
          {error}
        </p>
      )}

      {/* Empty state: Card with icon, message, and Create Your First Goal CTA */}
      {!loading && goals.length === 0 && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-bonsai-slate-200 bg-white p-8 shadow-sm">
            {/* Icon: Circular grey background with goals icon */}
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bonsai-slate-100">
                <GoalsIcon className="h-7 w-7 text-bonsai-slate-500" />
              </div>
            </div>
            {/* Heading */}
            <h2 className="mt-4 text-center text-body font-semibold text-bonsai-brown-700">
              No goals yet
            </h2>
            {/* Description */}
            <p className="mt-2 text-center text-body text-bonsai-slate-600">
              Start achieving your objectives by creating your first goal with milestones.
            </p>
            {/* CTA: Black pill button with plus and label */}
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-body font-semibold text-white transition-colors hover:bg-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-slate-500 focus:ring-offset-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals grid: responsive (1 col mobile, 2 cols tablet, 3 cols desktop) */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalGaugeCard
              key={goal.id}
              goal={goal}
              milestones={milestonesByGoal[goal.id] ?? []}
              onClick={() => handleGoalClick(goal.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit goal modal */}
      <AddEditGoalModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onCreateGoal={createGoal}
        onUpdateGoal={updateGoal}
        onDeleteGoal={deleteGoal}
        goal={editingGoal}
      />
    </div>
  )
}
