/* AddEditGoalModal: Create/Edit goal with name, description, start date, target date */
import { useState, useEffect } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import type { Goal, CreateGoalInput, UpdateGoalInput } from './types'

export interface AddEditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGoal?: (input: CreateGoalInput) => Promise<Goal>
  onUpdateGoal?: (id: string, input: UpdateGoalInput) => Promise<Goal>
  onDeleteGoal?: (id: string) => Promise<void>
  goal?: Goal | null
}

/**
 * Add/Edit goal modal: name, description, start date, target date.
 * Footer: Cancel (create) / Delete (edit with confirm), Create Goal / Save Changes (edit).
 */
export function AddEditGoalModal({
  isOpen,
  onClose,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  goal = null,
}: AddEditGoalModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isEditMode = !!goal

  /* Sync form state when modal opens or goal (edit) changes */
  useEffect(() => {
    if (isOpen) {
      if (goal) {
        setName(goal.name)
        setDescription(goal.description ?? '')
        setStartDate(goal.start_date)
        setTargetDate(goal.target_date)
        setDeleteConfirm(false)
      } else {
        /* Default dates: start = today, target = 30 days from today */
        const today = new Date()
        const target = new Date(today)
        target.setDate(target.getDate() + 30)
        setName('')
        setDescription('')
        setStartDate(today.toISOString().slice(0, 10))
        setTargetDate(target.toISOString().slice(0, 10))
      }
    }
  }, [isOpen, goal])

  /* Handle form submission */
  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !targetDate) return

    const input: CreateGoalInput | UpdateGoalInput = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate,
      target_date: targetDate,
    }

    try {
      setSubmitting(true)
      if (isEditMode && onUpdateGoal) {
        await onUpdateGoal(goal.id, input)
      } else if (!isEditMode && onCreateGoal) {
        await onCreateGoal(input as CreateGoalInput)
      }
      onClose()
    } catch {
      /* Error handled by parent / useGoals */
    } finally {
      setSubmitting(false)
    }
  }

  /* Handle delete */
  const handleDelete = async () => {
    if (!goal || !onDeleteGoal) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    try {
      setSubmitting(true)
      await onDeleteGoal(goal.id)
      onClose()
    } catch {
      /* Error handled by parent */
    } finally {
      setSubmitting(false)
    }
  }

  /* Validate dates */
  const isValid = name.trim() && startDate && targetDate && startDate <= targetDate

  const titleNode = (
    <div>
      <h2 className="text-body font-semibold text-bonsai-brown-700">
        {isEditMode ? 'Edit Goal' : 'Create New Goal'}
      </h2>
      <p className="text-secondary text-bonsai-slate-500 mt-0.5">
        {isEditMode ? 'Update your goal details' : 'Set a meaningful objective with milestones'}
      </p>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      fullScreenOnMobile
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEditMode ? (
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={submitting}
              >
                {deleteConfirm ? 'Confirm delete' : 'Delete'}
              </Button>
            ) : (
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {isEditMode ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Goal name */}
        <Input
          label="Goal Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Run a marathon, Learn Spanish, Build an app"
        />

        {/* Description */}
        <div>
          <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes or context about this goal..."
            rows={3}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
            />
          </div>
          <div>
            <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
            />
          </div>
        </div>

        {/* Validation error */}
        {startDate && targetDate && startDate > targetDate && (
          <p className="text-secondary text-red-600">
            Target date must be after start date
          </p>
        )}
      </div>
    </Modal>
  )
}
