/* AddEditGoalModal: Material create-goal modal */
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { MaterialIcon } from '../../components/MaterialIcon'
import { NewGoalModalForm } from './components/NewGoalModalForm'
import type { Goal, CreateGoalInput } from './types'
import type { CreateGoalSetupOptions } from './hooks/useGoals'

export interface AddEditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGoal?: (input: CreateGoalInput) => Promise<Goal>
  /** Create goal with milestones and habit links (preferred for new UI) */
  onCreateGoalWithSetup?: (
    input: CreateGoalInput,
    setup: CreateGoalSetupOptions,
  ) => Promise<Goal>
  forceIsActive?: boolean
}

/**
 * New Goal modal with Material layout (create only; editing is in GoalDrawer).
 */
export function AddEditGoalModal({
  isOpen,
  onClose,
  onCreateGoal,
  onCreateGoalWithSetup,
  forceIsActive,
}: AddEditGoalModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleCreateSubmit = async (
    input: CreateGoalInput,
    setup: CreateGoalSetupOptions,
  ) => {
    if (onCreateGoalWithSetup) {
      return onCreateGoalWithSetup(input, setup)
    }
    if (onCreateGoal) {
      const created = await onCreateGoal(input)
      return created
    }
    throw new Error('No create handler provided')
  }

  const createHeader = (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-lowest px-8 py-6">
      <h1 className="text-body font-semibold tracking-tight text-on-surface">New Goal</h1>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 transition-colors duration-200 hover:bg-surface-container-high"
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
      header={createHeader}
      overlayClassName="backdrop-blur-md bg-on-surface/20 p-4 md:p-6"
      cardClassName="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      disableBodyScroll
    >
      <NewGoalModalForm
        onSubmit={handleCreateSubmit}
        onClose={onClose}
        submitting={submitting}
        setSubmitting={setSubmitting}
        forceIsActive={forceIsActive}
      />
    </Modal>
  )
}
