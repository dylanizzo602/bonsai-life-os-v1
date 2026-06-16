/* GoalMilestoneTimeline: vertical milestone timeline for goal drawer */
import { useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { AddEditMilestoneModal } from '../../AddEditMilestoneModal'
import type { Task } from '../../../tasks/types'
import type { GoalMilestone, CreateMilestoneInput, UpdateMilestoneInput } from '../../types'
import {
  getMilestoneProgressPercent,
} from '../../utils/milestoneProgress'
import { formatGoalDate } from '../../utils/formatGoalDate'

interface GoalMilestoneTimelineProps {
  goalId: string
  milestones: GoalMilestone[]
  taskTreesByMilestoneId: Record<string, Task[]>
  onCreateMilestone: (input: CreateMilestoneInput) => Promise<GoalMilestone>
  onUpdateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<GoalMilestone>
  getTasks?: () => Promise<Array<{ id: string; title: string }>>
  onOpenEditTaskModal?: (task: Task) => void
}

function milestoneSubtitle(
  m: GoalMilestone,
  progress: number,
  taskTreesByMilestoneId: Record<string, Task[]>,
): string {
  if (progress >= 100 && m.updated_at) {
    return `Completed ${formatGoalDate(m.updated_at.slice(0, 10))}`
  }
  if (m.type === 'number' && m.target_value != null) {
    const current = m.current_value ?? m.start_value ?? 0
    const unit = m.unit ? ` ${m.unit}` : ''
    return `In progress — ${current} / ${m.target_value}${unit}`
  }
  if (m.type === 'task') {
    const tree = taskTreesByMilestoneId[m.id] ?? []
    const counted = tree.filter((t) => t.status !== 'deleted')
    const done = counted.filter((t) => t.status === 'completed').length
    if (counted.length > 0) return `In progress — ${done} / ${counted.length} tasks`
  }
  if (progress > 0) return 'In progress'
  return 'Not started'
}

/**
 * Timeline list with status circles, progress hints, and add/edit via modal.
 */
export function GoalMilestoneTimeline({
  goalId,
  milestones,
  taskTreesByMilestoneId,
  onCreateMilestone,
  onUpdateMilestone,
  getTasks,
  onOpenEditTaskModal,
}: GoalMilestoneTimelineProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null)

  const openCreate = () => {
    setEditingMilestone(null)
    setModalOpen(true)
  }

  const openEdit = (m: GoalMilestone) => {
    if (m.type === 'task' && m.task && onOpenEditTaskModal) {
      onOpenEditTaskModal(m.task)
      return
    }
    setEditingMilestone(m)
    setModalOpen(true)
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
        Milestones
      </h3>

      <div className="flex flex-col">
        {milestones.map((m, index) => {
          const progress = getMilestoneProgressPercent(m, taskTreesByMilestoneId[m.id])
          const isComplete = progress >= 100
          const isInProgress = progress > 0 && progress < 100
          const isLast = index === milestones.length - 1
          const subtitle = milestoneSubtitle(m, progress, taskTreesByMilestoneId)

          return (
            <div key={m.id} className={`group relative pl-8 ${isLast ? 'pb-4' : 'pb-6'}`}>
              {!isLast && (
                <div className="absolute bottom-0 left-[11px] top-6 w-0.5 bg-outline-variant/50" />
              )}

              <button
                type="button"
                onClick={() => openEdit(m)}
                className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full text-on-primary"
                aria-label={`Edit milestone: ${m.title}`}
              >
                {isComplete ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <MaterialIcon name="check" className="text-[14px] text-on-primary" filled />
                  </span>
                ) : isInProgress ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-surface text-primary">
                    <MaterialIcon name="sync" className="text-[14px]" />
                  </span>
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-outline-variant bg-surface-container-low" />
                )}
              </button>

              <button
                type="button"
                onClick={() => openEdit(m)}
                className="w-full text-left"
              >
                <span
                  className={`font-semibold ${
                    isComplete ? 'text-on-surface' : isInProgress ? 'text-on-surface' : 'font-medium text-on-surface-variant'
                  }`}
                >
                  {m.title}
                </span>
                <div className="mt-1 flex flex-col gap-1.5">
                  <span className="text-xs text-on-surface-variant">{subtitle}</span>
                  {isInProgress && (
                    <div className="h-1.5 max-w-[120px] overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(progress)}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            </div>
          )
        })}

        <div className="relative pl-8">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
          >
            <MaterialIcon name="add" className="text-[20px]" />
            <span>Add Milestone</span>
          </button>
        </div>
      </div>

      <AddEditMilestoneModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingMilestone(null)
        }}
        goalId={goalId}
        onCreateMilestone={onCreateMilestone}
        onUpdateMilestone={onUpdateMilestone}
        milestone={editingMilestone}
        getTasks={getTasks}
      />
    </section>
  )
}
