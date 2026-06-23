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
    <BriefingShell className="overflow-x-hidden">
      <div className="mx-auto min-w-0 max-w-4xl">
        {/* Header: room for close button; title wraps on narrow screens */}
        <div className="relative mb-8 px-10 text-center md:mb-12 md:px-12">
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

        {/* Goal carousel: narrow side columns on mobile so the card never forces horizontal scroll */}
        <div className="mb-12 grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-1 sm:gap-2 md:mb-16 md:gap-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="shrink-0 rounded-full p-1 text-outline-variant transition-all hover:text-primary disabled:opacity-30 md:p-2"
            aria-label="Previous goal"
          >
            <MaterialIcon name="chevron_left" className="text-[28px] md:text-[40px]" />
          </button>

          <div className="min-w-0 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm sm:p-6 md:p-12">
            <div className="flex min-w-0 flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-fixed md:mb-6 md:h-16 md:w-16">
                <MaterialIcon name="flag" className="text-[28px] text-primary md:text-[32px]" filled />
              </div>
              <h2 className="text-page-title mb-2 w-full min-w-0 break-words font-semibold text-on-surface">
                {goal.name}
              </h2>
              {goal.description ? (
                <p className="text-body mb-6 w-full min-w-0 break-words text-on-surface-variant [overflow-wrap:anywhere] md:mb-8">
                  {goal.description}
                </p>
              ) : null}
              <div className="w-full min-w-0 max-w-lg">
                <div className="mb-2 flex items-end justify-between gap-2">
                  <span className="text-secondary text-xs font-bold uppercase tracking-wider text-outline">
                    Overall Progress
                  </span>
                  <span className="shrink-0 font-bold text-primary">{goal.progress}%</span>
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
            className="shrink-0 rounded-full p-1 text-outline-variant transition-all hover:text-primary disabled:opacity-30 md:p-2"
            aria-label="Next goal"
          >
            <MaterialIcon name="chevron_right" className="text-[28px] md:text-[40px]" />
          </button>
        </div>

        <div className="mx-auto min-w-0 max-w-2xl">
          <div className="mb-6 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3 className="text-body font-medium text-on-surface">Milestones</h3>
            <span className="text-secondary shrink-0 text-on-surface-variant">
              {completedCount} of {milestones.length} completed
            </span>
          </div>
          <div className="min-w-0 space-y-4">
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
