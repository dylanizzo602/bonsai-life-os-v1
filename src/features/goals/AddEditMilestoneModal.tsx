/* AddEditMilestoneModal: Create/Edit milestone with type-specific fields */
import { useState, useEffect } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { TaskSearchSelect } from '../../components/TaskSearchSelect'
import type {
  GoalMilestone,
  GoalMilestoneType,
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
}

const MILESTONE_TYPE_OPTIONS: { value: GoalMilestoneType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'number', label: 'Number/Unit' },
  { value: 'boolean', label: 'True/False' },
]

/**
 * Add/Edit milestone modal.
 * Supports three milestone types: task (linked to task), number (start/target/current with unit), boolean (true/false).
 */
export function AddEditMilestoneModal({
  isOpen,
  onClose,
  goalId,
  onCreateMilestone,
  onUpdateMilestone,
  milestone = null,
  getTasks,
}: AddEditMilestoneModalProps) {
  const [type, setType] = useState<GoalMilestoneType>('boolean')
  const [title, setTitle] = useState('')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [startValue, setStartValue] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [unit, setUnit] = useState('')
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isEditMode = !!milestone

  /* Sync form state when modal opens or milestone (edit) changes */
  useEffect(() => {
    if (isOpen) {
      if (milestone) {
        setType(milestone.type)
        setTitle(milestone.title)
        setTaskId(milestone.task_id)
        setStartValue(milestone.start_value?.toString() ?? '')
        setTargetValue(milestone.target_value?.toString() ?? '')
        setCurrentValue(milestone.current_value?.toString() ?? '')
        setUnit(milestone.unit ?? '')
        setCompleted(milestone.completed)
      } else {
        setType('boolean')
        setTitle('')
        setTaskId(null)
        setStartValue('')
        setTargetValue('')
        setCurrentValue('')
        setUnit('')
        setCompleted(false)
      }
    }
  }, [isOpen, milestone])

  /* Handle form submission */
  const handleSubmit = async () => {
    if (!title.trim()) return

    try {
      setSubmitting(true)

      if (isEditMode) {
        const input: UpdateMilestoneInput = {
          title: title.trim(),
        }

        if (type === 'task') {
          input.task_id = taskId
        } else if (type === 'number') {
          input.start_value = startValue ? parseFloat(startValue) : null
          input.target_value = targetValue ? parseFloat(targetValue) : null
          input.current_value = currentValue ? parseFloat(currentValue) : null
          input.unit = unit.trim() || null
        } else {
          input.completed = completed
        }

        await onUpdateMilestone(milestone.id, input)
      } else {
        const input: CreateMilestoneInput = {
          goal_id: goalId,
          type,
          title: title.trim(),
        }

        if (type === 'task') {
          input.task_id = taskId
        } else if (type === 'number') {
          input.start_value = startValue ? parseFloat(startValue) : null
          input.target_value = targetValue ? parseFloat(targetValue) : null
          input.current_value = currentValue ? parseFloat(currentValue) : null
          input.unit = unit.trim() || null
        } else {
          input.completed = completed
        }

        await onCreateMilestone(input)
      }

      onClose()
    } catch {
      /* Error handled by parent */
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = title.trim() && (type !== 'task' || taskId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Milestone' : 'Add Milestone'}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {isEditMode ? 'Save Changes' : 'Create Milestone'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Milestone type selector (only when creating) */}
        {!isEditMode && (
          <Select
            label="Milestone Type"
            options={MILESTONE_TYPE_OPTIONS}
            value={type}
            onChange={(e) => setType(e.target.value as GoalMilestoneType)}
          />
        )}

        {/* Title */}
        <Input
          label="Milestone Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Complete first draft, Run 5km, Finish course"
        />

        {/* Type-specific fields */}
        {type === 'task' && getTasks && (
          <div>
            <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
              Link Task
            </label>
            <TaskSearchSelect
              getTasks={getTasks}
              onSelectTask={(task) => setTaskId(task.id)}
              placeholder="Search for a task..."
              label="Select a task to link"
            />
            {taskId && (
              <p className="mt-2 text-secondary text-bonsai-slate-600">
                Task selected (ID: {taskId})
              </p>
            )}
          </div>
        )}

        {type === 'number' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Value"
                type="number"
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
                placeholder="0"
              />
              <Input
                label="Target Value"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Current Value"
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0"
              />
              <Input
                label="Unit (optional)"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., kg, miles, pages"
              />
            </div>
          </div>
        )}

        {type === 'boolean' && (
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-4 h-4 text-bonsai-sage-600 border-bonsai-slate-300 rounded focus:ring-2 focus:ring-bonsai-sage-500"
              />
              <span className="text-secondary text-bonsai-slate-700">Completed</span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  )
}
