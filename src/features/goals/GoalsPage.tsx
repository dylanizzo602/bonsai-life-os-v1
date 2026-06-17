/* Goals page: Material-style list with active cards, inactive rows, and completed forest */

import { useState, useEffect, useMemo } from 'react'
import { MaterialIcon } from '../../components/MaterialIcon'
import { GoalsIcon } from '../../components/icons'
import { useGoals } from './hooks/useGoals'
import { ActiveGoalCard } from './ActiveGoalCard'
import { InactiveGoalRow } from './InactiveGoalRow'
import { CompletedGoalsForest } from './CompletedGoalsForest'
import { GoalDrawer } from './GoalDrawer'
import { AddEditGoalModal } from './AddEditGoalModal'
import { getMilestonesForGoal, getTaskTreesByMilestoneId } from '../../lib/supabase/goals'
import type { Task } from '../tasks/types'
import type { Goal, GoalMilestone } from './types'
import { aggregateGoalProgressPercent } from './utils/milestoneProgress'
import { resolveGoalProgressPercent } from './utils/goalDisplay'

/**
 * Goals page component.
 * Displays active goal cards, inactive rows, and a completed goals forest.
 * Clicking a goal opens the goal detail drawer.
 */
export function GoalsPage() {
  /* Data + modal state: list goals, optional detail view, create/edit modal */
  const { goals, loading, error, createGoal, createGoalWithSetup, updateGoal, refetch, patchGoal } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [milestonesByGoal, setMilestonesByGoal] = useState<Record<string, GoalMilestone[]>>({})
  const [taskTreesByMilestoneId, setTaskTreesByMilestoneId] = useState<Record<string, Task[]>>({})
  const [modalOpen, setModalOpen] = useState(false)

  /* Fetch milestones and task trees for progress labels and bucketing */
  useEffect(() => {
    const fetchMilestones = async () => {
      const milestonesMap: Record<string, GoalMilestone[]> = {}
      const mergedTrees: Record<string, Task[]> = {}
      for (const goal of goals) {
        try {
          const milestones = await getMilestonesForGoal(goal.id)
          milestonesMap[goal.id] = milestones
          const trees = await getTaskTreesByMilestoneId(milestones)
          Object.assign(mergedTrees, trees)
        } catch (err) {
          console.error(`Error fetching milestones for goal ${goal.id}:`, err)
          milestonesMap[goal.id] = []
        }
      }
      setMilestonesByGoal(milestonesMap)
      setTaskTreesByMilestoneId(mergedTrees)
    }

    if (goals.length > 0) {
      void fetchMilestones()
    } else {
      setMilestonesByGoal({})
      setTaskTreesByMilestoneId({})
    }
  }, [goals])

  /* Resolve progress percent per goal for three-bucket split */
  const progressByGoalId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const goal of goals) {
      map[goal.id] = resolveGoalProgressPercent(
        goal,
        milestonesByGoal[goal.id],
        taskTreesByMilestoneId,
        aggregateGoalProgressPercent,
      )
    }
    return map
  }, [goals, milestonesByGoal, taskTreesByMilestoneId])

  /* Split goals into active, inactive, and completed sections */
  const { activeGoals, inactiveGoals, completedGoals } = useMemo(() => {
    const active: Goal[] = []
    const inactive: Goal[] = []
    const completed: Goal[] = []

    for (const goal of goals) {
      const progress = progressByGoalId[goal.id] ?? goal.progress ?? 0
      if (progress >= 100) {
        completed.push(goal)
      } else if (goal.is_active === false) {
        inactive.push(goal)
      } else {
        active.push(goal)
      }
    }

    return { activeGoals: active, inactiveGoals: inactive, completedGoals: completed }
  }, [goals, progressByGoalId])

  /* Handle goal card click: open detail drawer */
  const handleGoalClick = (goalId: string) => {
    setSelectedGoalId(goalId)
  }

  /* Handle create goal button */
  const handleOpenCreate = () => {
    setModalOpen(true)
  }

  /* Handle close modal */
  const handleCloseModal = () => {
    setModalOpen(false)
  }

  /* Close drawer and refresh list */
  const handleCloseDrawer = () => {
    setSelectedGoalId(null)
    void refetch()
  }

  /* Resume a paused inactive goal */
  const handleResumeGoal = async (goalId: string) => {
    try {
      await updateGoal(goalId, { is_active: true })
      await refetch()
    } catch (err) {
      console.error('Error resuming goal:', err)
    }
  }

  const hasListContent =
    activeGoals.length > 0 || inactiveGoals.length > 0 || completedGoals.length > 0

  return (
    <div className="min-h-full w-full max-w-[1200px] mx-auto pb-16 md:pb-24">
      {/* Header: title and Add Goal button */}
      <header className="mb-10 flex flex-col items-start justify-between gap-6 md:mb-12 md:flex-row md:items-end">
        <div>
          <h1 className="text-page-title font-semibold font-headline tracking-tight text-on-surface">
            Goals
          </h1>
          <p className="mt-2 max-w-xl text-secondary text-on-surface-variant">
            Track your journey and nurture your long-term intentions.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-body font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
        >
          <MaterialIcon name="add" className="text-[20px]" />
          Add Goal
        </button>
      </header>

      {/* Loading state */}
      {loading && (
        <p className="text-body py-8 text-on-surface-variant">Loading goals…</p>
      )}

      {/* Error state */}
      {error && (
        <p className="text-body py-2 text-error" role="alert">
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && goals.length === 0 && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                <GoalsIcon className="h-7 w-7 text-outline" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-body font-semibold text-on-surface">
              No goals yet
            </h2>
            <p className="mt-2 text-center text-body text-on-surface-variant">
              Start achieving your objectives by creating your first goal with milestones.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-body font-semibold text-on-primary transition-colors hover:bg-primary-container"
              >
                <MaterialIcon name="add" className="text-[20px]" />
                Create Your First Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active goals grid */}
      {!loading && activeGoals.length > 0 && (
        <section className="mb-16">
          <div className="mb-8 flex items-center gap-3">
            <MaterialIcon name="eco" className="text-[24px] text-primary" filled />
            <h2 className="text-body font-semibold font-headline text-on-surface">
              Active Goals
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal, index) => (
              <ActiveGoalCard
                key={goal.id}
                goal={goal}
                milestones={milestonesByGoal[goal.id] ?? []}
                taskTreesByMilestoneId={taskTreesByMilestoneId}
                computedProgressPercent={progressByGoalId[goal.id]}
                accentIndex={index}
                onClick={() => handleGoalClick(goal.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Inactive goals rows */}
      {!loading && inactiveGoals.length > 0 && (
        <section className="mb-16 md:mb-24">
          <h2 className="mb-6 text-secondary font-bold uppercase tracking-widest text-outline">
            Inactive Goals
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inactiveGoals.map((goal) => (
              <InactiveGoalRow
                key={goal.id}
                goal={goal}
                onOpen={handleGoalClick}
                onResume={handleResumeGoal}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed goals forest */}
      {!loading && completedGoals.length > 0 && (
        <CompletedGoalsForest goals={completedGoals} onOpenGoal={handleGoalClick} />
      )}

      {/* Fallback when all goals are filtered but list had items (edge case) */}
      {!loading && goals.length > 0 && !hasListContent && (
        <p className="text-body text-on-surface-variant">No goals to display.</p>
      )}

      {/* Create goal modal */}
      <AddEditGoalModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onCreateGoalWithSetup={createGoalWithSetup}
        onCreateGoal={createGoal}
      />

      {/* Goal detail drawer overlay */}
      {selectedGoalId && (
        <GoalDrawer
          key={selectedGoalId}
          goalId={selectedGoalId}
          onClose={handleCloseDrawer}
          onDeleted={refetch}
          onGoalUpdated={patchGoal}
        />
      )}
    </div>
  )
}
