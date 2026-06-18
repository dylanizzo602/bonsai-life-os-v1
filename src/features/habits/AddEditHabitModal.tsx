/* AddEditHabitModal: Material shell for create/edit habit with HabitModalForm */

import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { MaterialIcon } from '../../components/MaterialIcon'
import type { Habit, CreateHabitInput, UpdateHabitInput } from './types'
import { HabitModalForm } from './components/HabitModalForm'

export interface AddEditHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateHabit?: (input: CreateHabitInput) => Promise<Habit>
  onUpdateHabit?: (id: string, input: UpdateHabitInput) => Promise<Habit>
  onDeleteHabit?: (id: string) => Promise<void>
  habit?: Habit | null
}

/**
 * Add/Edit habit modal with Material layout.
 */
export function AddEditHabitModal({
  isOpen,
  onClose,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  habit = null,
}: AddEditHabitModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const isEditMode = !!habit

  const handleDelete = async () => {
    if (!habit || !onDeleteHabit) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    try {
      setSubmitting(true)
      await onDeleteHabit(habit.id)
      onClose()
    } catch {
      /* Parent handles error */
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <div className="flex items-center justify-between px-8 py-8">
      <div>
        <h2 className="text-body font-bold tracking-tight text-on-surface">
          {isEditMode ? 'Edit Habit' : 'New Habit'}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {isEditMode && onDeleteHabit && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-secondary font-semibold text-error transition-colors hover:bg-error-container/30"
          >
            {deleteConfirm ? 'Confirm delete' : 'Delete'}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 transition-colors hover:bg-surface-container"
          aria-label="Close"
        >
          <MaterialIcon name="close" className="text-[24px] text-outline" />
        </button>
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={header}
      overlayClassName="backdrop-blur-md bg-inverse-surface/10 p-4"
      cardClassName="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      disableBodyScroll
    >
      <HabitModalForm
        habit={habit}
        onCreateHabit={onCreateHabit}
        onUpdateHabit={onUpdateHabit}
        onClose={onClose}
        submitting={submitting}
        setSubmitting={setSubmitting}
      />
    </Modal>
  )
}
