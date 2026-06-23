/* MilestoneModalForm: Create/edit milestone form body with Material styling */
import { useState, useEffect, useMemo } from 'react'
import { MilestoneTrackingTypeSelector } from './MilestoneTrackingTypeSelector'
import { MilestoneLinkedTasksField } from './MilestoneLinkedTasksField'
import { MilestoneEditQuantityPanel } from './milestone-edit/MilestoneEditQuantityPanel'
import { MilestoneEditTasksPanel } from './milestone-edit/MilestoneEditTasksPanel'
import { MilestoneEditCheckmarkPanel } from './milestone-edit/MilestoneEditCheckmarkPanel'
import type { TaskOption } from '../../../components/TaskSearchSelect'
import type { Task } from '../../tasks/types'
import type {
  GoalMilestone,
  GoalMilestoneType,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../types'

export interface MilestoneModalFormProps {
  goalId: string
  milestone?: GoalMilestone | null
  onCreateMilestone: (input: CreateMilestoneInput) => Promise<GoalMilestone>
  onUpdateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<GoalMilestone>
  onClose: () => void
  submitting: boolean
  setSubmitting: (value: boolean) => void
  getTasks?: () => Promise<Array<TaskOption>>
  /** Task trees for edit-mode task milestone checklist */
  taskTreesByMilestoneId?: Record<string, Task[]>
  onOpenEditTaskModal?: (task: Task) => void
}

/**
 * Form body for the add/edit milestone modal.
 * Create mode: type selector and type-specific fields.
 * Edit mode: type-specific update UI per design (quantity stepper, task checklist, checkmark toggle).
 */
export function MilestoneModalForm({
  goalId,
  milestone = null,
  onCreateMilestone,
  onUpdateMilestone,
  onClose,
  submitting,
  setSubmitting,
  getTasks,
  taskTreesByMilestoneId = {},
  onOpenEditTaskModal,
}: MilestoneModalFormProps) {
  const isEditMode = !!milestone

  /* Form state: type, title, linked tasks, quantity fields, description */
  const [type, setType] = useState<GoalMilestoneType>('task')
  const [title, setTitle] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<TaskOption[]>([])
  const [startValue, setStartValue] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [unit, setUnit] = useState('')
  const [description, setDescription] = useState('')
  const [completed, setCompleted] = useState(false)

  /* Sync form when milestone prop changes (edit mode) */
  useEffect(() => {
    if (milestone) {
      setType(milestone.type)
      setTitle(milestone.title)
      setSelectedTasks(
        (milestone.linked_tasks ?? []).map((t) => ({ id: t.id, title: t.title })),
      )
      setStartValue(milestone.start_value?.toString() ?? '')
      setTargetValue(milestone.target_value?.toString() ?? '')
      setCurrentValue(
        (milestone.current_value ?? milestone.start_value ?? 0).toString(),
      )
      setUnit(milestone.unit ?? '')
      setDescription(milestone.description ?? '')
      setCompleted(milestone.completed)
    } else {
      setType('task')
      setTitle('')
      setSelectedTasks([])
      setStartValue('')
      setTargetValue('')
      setCurrentValue('')
      setUnit('')
      setDescription('')
      setCompleted(false)
    }
  }, [milestone])

  /* Tasks shown in edit-mode checklist (full tree when available) */
  const editTaskList = useMemo(() => {
    if (!milestone || milestone.type !== 'task') return []
    const tree = taskTreesByMilestoneId[milestone.id]
    if (tree && tree.length > 0) return tree
    return milestone.linked_tasks ?? []
  }, [milestone, taskTreesByMilestoneId])

  const parsedCurrent = currentValue ? parseFloat(currentValue) : 0
  const parsedStart = startValue ? parseFloat(startValue) : null
  const parsedTarget = targetValue ? parseFloat(targetValue) : null

  /* Validation */
  const isValid = isEditMode
    ? type === 'boolean' || title.trim().length > 0
    : title.trim().length > 0 && (type !== 'task' || selectedTasks.length > 0)

  /* Submit handler: build input and call create or update */
  const handleSubmit = async () => {
    if (!isValid) return

    try {
      setSubmitting(true)

      if (isEditMode && milestone) {
        const input: UpdateMilestoneInput = {}

        if (type === 'boolean') {
          input.completed = completed
        } else {
          input.title = title.trim()
          if (type === 'number') {
            input.current_value = Number.isNaN(parsedCurrent) ? null : parsedCurrent
          }
        }

        await onUpdateMilestone(milestone.id, input)
      } else {
        const input: CreateMilestoneInput = {
          goal_id: goalId,
          type,
          title: title.trim(),
          description: description.trim() || null,
        }

        if (type === 'task') {
          input.task_ids = selectedTasks.map((t) => t.id)
        } else if (type === 'number') {
          const parsedStartNum = startValue ? parseFloat(startValue) : 0
          input.start_value = parsedStartNum
          input.target_value = targetValue ? parseFloat(targetValue) : null
          input.current_value = parsedStartNum
          input.unit = unit.trim() || null
        } else {
          input.completed = false
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

  const saveLabel = submitting
    ? 'Saving…'
    : isEditMode
      ? type === 'boolean'
        ? 'Save Update'
        : 'Save Changes'
      : 'Add Milestone'

  /* Edit mode: type-specific update layout */
  if (isEditMode && milestone) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-6 md:space-y-8 md:px-8 md:pb-8">
          {/* Milestone name: editable for task/number, read-only for checkmark */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest text-outline">
              Milestone Name
            </label>
            {type === 'boolean' ? (
              <div className="border-b border-outline-variant/30 px-1 py-3 text-lg font-medium text-on-surface">
                {title}
              </div>
            ) : (
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter milestone title..."
                className="w-full border-0 border-b border-outline-variant bg-transparent py-2 text-body font-medium text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-0"
              />
            )}
          </div>

          {type === 'number' && (
            <MilestoneEditQuantityPanel
              startValue={parsedStart}
              targetValue={parsedTarget}
              currentValue={Number.isNaN(parsedCurrent) ? 0 : parsedCurrent}
              unit={unit.trim() || null}
              onCurrentChange={(value) => setCurrentValue(String(value))}
            />
          )}

          {type === 'task' && (
            <MilestoneEditTasksPanel
              tasks={editTaskList}
              onOpenTask={onOpenEditTaskModal}
            />
          )}

          {type === 'boolean' && (
            <MilestoneEditCheckmarkPanel completed={completed} onToggle={setCompleted} />
          )}
        </div>

        <footer className="shrink-0 border-t border-outline-variant/10 bg-surface-container-low px-4 py-4 md:px-8 md:py-6">
          <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2.5 text-secondary font-medium text-on-surface-variant transition-colors hover:bg-surface-container md:px-6"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !isValid}
              className="rounded-lg bg-primary px-6 py-2.5 text-body font-semibold text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:px-8"
            >
              {saveLabel}
            </button>
          </div>
        </footer>
      </div>
    )
  }

  /* Create mode: original add-milestone layout */
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-4 md:px-8 md:pb-8">
        <div className="space-y-2">
          <label className="block text-secondary font-semibold tracking-wide text-on-surface-variant">
            Milestone Name
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design Prototype Complete"
            className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-body transition-all placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>

        <MilestoneTrackingTypeSelector value={type} onChange={setType} />

        <div className="space-y-2 rounded-lg border border-dashed border-outline-variant/50 bg-surface-container-low/40 p-4">
          {type === 'task' && getTasks && (
            <MilestoneLinkedTasksField
              getTasks={getTasks}
              selectedTasks={selectedTasks}
              onChange={setSelectedTasks}
            />
          )}

          {type === 'number' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-secondary font-semibold text-on-surface-variant">
                  Starting
                </label>
                <input
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-secondary font-semibold text-on-surface-variant">
                  Target
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-secondary font-semibold text-on-surface-variant">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="$, kg, unit"
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {type === 'boolean' && (
            <p className="text-secondary text-on-surface-variant">
              A simple checkmark milestone — mark it complete when you reach this checkpoint.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-secondary font-semibold tracking-wide text-on-surface-variant">
            Milestone Note/Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any extra context or requirements for this milestone..."
            rows={3}
            className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-secondary transition-all placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-outline-variant/10 bg-surface-container-low/30 px-4 py-4 md:px-8 md:py-6">
        <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-6 py-2.5 text-secondary font-semibold text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !isValid}
            className="rounded-lg bg-primary px-6 py-2.5 text-body font-semibold text-on-primary shadow-sm transition-all hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:px-8"
          >
            {saveLabel}
          </button>
        </div>
      </footer>
    </div>
  )
}
