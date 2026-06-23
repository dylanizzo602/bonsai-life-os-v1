/* AddEditMilestoneModal: Material-styled create/edit milestone modal */
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { MaterialIcon } from '../../components/MaterialIcon'
import { MilestoneModalForm } from './components/MilestoneModalForm'
import type { Task } from '../tasks/types'
import type {
  GoalMilestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from './types'

export interface AddEditMilestoneModalProps {
  isOpen: boolean
  onClose: () => void
  goalId: string
  onCreateMilestone: (input: CreateMilestoneInput) => Promise<GoalMilestone>
  onUpdateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<GoalMilestone>
  milestone?: GoalMilestone | null
  /** Function to fetch tasks for task picker */
  getTasks?: () => Promise<Array<{ id: string; title: string }>>
  /** Task trees for edit-mode linked task checklist */
  taskTreesByMilestoneId?: Record<string, Task[]>
  onOpenEditTaskModal?: (task: Task) => void
}

/**
 * Add/Edit milestone modal with Material layout.
 * Create: multi-type form with tracking selector.
 * Edit: type-specific update UI (quantity stepper, task checklist, checkmark toggle).
 */
export function AddEditMilestoneModal({
  isOpen,
  onClose,
  goalId,
  onCreateMilestone,
  onUpdateMilestone,
  milestone = null,
  getTasks,
  taskTreesByMilestoneId,
  onOpenEditTaskModal,
}: AddEditMilestoneModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const isEditMode = !!milestone
  const isCheckmarkEdit = isEditMode && milestone?.type === 'boolean'

  /* Header: edit mode includes subtitle; checkmark uses bordered compact header */
  const header = isEditMode ? (
    isCheckmarkEdit ? (
      <header className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-4 md:px-8 md:py-6">
        <h2 className="text-body font-semibold tracking-tight text-on-surface">Update Milestone</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          aria-label="Close"
        >
          <MaterialIcon name="close" />
        </button>
      </header>
    ) : (
      <header className="flex min-w-0 items-start justify-between gap-3 px-4 pb-4 pt-6 md:px-8 md:pb-6 md:pt-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-body font-semibold leading-none tracking-tight text-on-surface">
            Update Milestone
          </h1>
          <p className="mt-2 text-secondary text-on-surface-variant">
            Log your progress and stay mindful of your growth.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant transition-colors hover:text-primary"
          aria-label="Close"
        >
          <MaterialIcon name="close" />
        </button>
      </header>
    )
  ) : (
    <header className="flex items-center justify-between px-4 pb-4 pt-6 md:px-8 md:pt-8">
      <h2 className="text-body font-semibold tracking-tight text-on-surface">Add Milestone</h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 transition-all hover:bg-surface-container-high"
        aria-label="Close"
      >
        <MaterialIcon name="close" className="text-on-surface-variant" />
      </button>
    </header>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={header}
      overlayClassName={
        isCheckmarkEdit
          ? 'bg-on-surface/40 p-4 backdrop-blur-sm'
          : 'bg-surface/70 p-4 backdrop-blur-sm md:p-6'
      }
      cardClassName={`flex max-h-[90vh] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest ${
        isEditMode
          ? 'max-w-[min(560px,100%)] shadow-[0_20px_50px_rgba(81,96,81,0.12)]'
          : 'max-w-[min(36rem,100%)] shadow-[0_20px_50px_rgba(91,107,135,0.12)]'
      }`}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      disableBodyScroll
    >
      <MilestoneModalForm
        goalId={goalId}
        milestone={milestone}
        onCreateMilestone={onCreateMilestone}
        onUpdateMilestone={onUpdateMilestone}
        onClose={onClose}
        submitting={submitting}
        setSubmitting={setSubmitting}
        getTasks={getTasks}
        taskTreesByMilestoneId={taskTreesByMilestoneId}
        onOpenEditTaskModal={onOpenEditTaskModal}
      />
    </Modal>
  )
}
