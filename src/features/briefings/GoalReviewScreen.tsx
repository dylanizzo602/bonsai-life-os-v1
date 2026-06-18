/* GoalReviewScreen: Sunday goal carousel + milestone updates */

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../components/MaterialIcon'
import { AddEditMilestoneModal } from '../goals/AddEditMilestoneModal'
import { BriefingMilestoneRow } from './components/BriefingMilestoneRow'
import { BriefingShell } from './components/BriefingShell'
import { countFullyCompleteMilestones } from '../goals/utils/milestoneProgress'
import type { Goal, GoalMilestone, CreateMilestoneInput, UpdateMilestoneInput } from '../goals/types'
import type { Task } from '../tasks/types'

interface GoalReviewScreenProps {
  goals: Goal[]
  /** Controlled carousel index (from briefing footer Next / Save & Continue) */
  index?: number
  onIndexChange?: (index: number) => void
  milestonesByGoal: Record<string, GoalMilestone[]>
  taskTreesByMilestoneId: Record<string, Task[]>
  onUpdateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<GoalMilestone>
  getTasks?: () => Promise<Array<{ id: string; title: string }>>
  onOpenEditTaskModal?: (task: Task) => void
  onClose?: () => void
}

/**
 * Sunday goal review: carousel of active goals with milestone updates via modal.
 * Primary CTA lives in BriefingProgressFooter (parent).
 */
export function GoalReviewScreen({
  goals,
  index: controlledIndex,
  onIndexChange,
  milestonesByGoal,
  taskTreesByMilestoneId,
  onUpdateMilestone,
  getTasks,
  onOpenEditTaskModal,
  onClose,
}: GoalReviewScreenProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null)
  const index = controlledIndex ?? internalIndex

  /* Carousel index: parent-controlled when index/onIndexChange are provided */
  const setIndex = (next: number | ((current: number) => number)) => {
    const resolved = typeof next === 'function' ? next(index) : next
    onIndexChange?.(resolved)
    if (controlledIndex === undefined) {
      setInternalIndex(resolved)
    }
  }

  const goal = goals[index]
  const milestones = goal ? (milestonesByGoal[goal.id] ?? []) : []
  const completedCount = countFullyCompleteMilestones(milestones, taskTreesByMilestoneId)

  /* Close milestone modal when switching goals */
  useEffect(() => {
    setModalOpen(false)
    setEditingMilestone(null)
  }, [goal?.id])

  const openMilestoneModal = (milestone: GoalMilestone) => {
    setEditingMilestone(milestone)
    setModalOpen(true)
  }

  const closeMilestoneModal = () => {
    setModalOpen(false)
    setEditingMilestone(null)
  }

  if (goals.length === 0) {
    return null
  }

  return (
    <BriefingShell>
      <div className="mx-auto max-w-4xl">
        <div className="relative mb-12 text-center">
          {onClose != null ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Close briefing"
            >
              <MaterialIcon name="close" className="text-on-surface-variant" />
            </button>
          ) : null}
          <span className="text-secondary mb-2 block text-xs font-bold uppercase tracking-wider text-primary">
            Goals Review
          </span>
          <h1 className="text-page-title font-semibold tracking-tight text-on-surface">
            Let&apos;s check in on your priorities.
          </h1>
        </div>

        <div className="mb-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full p-2 text-outline-variant transition-all hover:text-primary disabled:opacity-30"
            aria-label="Previous goal"
          >
            <MaterialIcon name="chevron_left" className="text-[40px]" />
          </button>

          <div className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-sm md:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary-fixed">
                <MaterialIcon name="flag" className="text-[32px] text-primary" filled />
              </div>
              <h2 className="text-page-title mb-2 font-semibold text-on-surface">{goal.name}</h2>
              {goal.description ? (
                <p className="text-body mb-8 max-w-md text-on-surface-variant">{goal.description}</p>
              ) : null}
              <div className="w-full max-w-lg">
                <div className="mb-2 flex items-end justify-between">
                  <span className="text-secondary text-xs font-bold uppercase tracking-wider text-outline">
                    Overall Progress
                  </span>
                  <span className="font-bold text-primary">{goal.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(goals.length - 1, i + 1))}
            disabled={index >= goals.length - 1}
            className="rounded-full p-2 text-outline-variant transition-all hover:text-primary disabled:opacity-30"
            aria-label="Next goal"
          >
            <MaterialIcon name="chevron_right" className="text-[40px]" />
          </button>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-body font-medium text-on-surface">Milestones</h3>
            <span className="text-secondary text-on-surface-variant">
              {completedCount} of {milestones.length} completed
            </span>
          </div>
          <div className="space-y-4">
            {milestones.map((m) => (
              <BriefingMilestoneRow
                key={m.id}
                milestone={m}
                taskTree={taskTreesByMilestoneId[m.id]}
                onClick={() => openMilestoneModal(m)}
              />
            ))}
          </div>
        </div>
      </div>

      <AddEditMilestoneModal
        isOpen={modalOpen}
        onClose={closeMilestoneModal}
        goalId={goal.id}
        onCreateMilestone={async (_input: CreateMilestoneInput) => {
          throw new Error('Creating milestones is not available during briefing review')
        }}
        onUpdateMilestone={onUpdateMilestone}
        milestone={editingMilestone}
        getTasks={getTasks}
        taskTreesByMilestoneId={taskTreesByMilestoneId}
        onOpenEditTaskModal={onOpenEditTaskModal}
      />
    </BriefingShell>
  )
}
