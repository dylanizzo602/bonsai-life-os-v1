/* IdentitySlotPickerModal: assign a habit or goal into one of the 3 identity slots */

import { useMemo, useState } from 'react'
import type { IdentitySlotResolved } from '../../../lib/supabase/identities'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Select } from '../../../components/Select'
import { useHabits } from '../../habits/hooks/useHabits'
import { useGoals } from '../hooks/useGoals'
import { AddEditGoalModal } from '../AddEditGoalModal'

export interface IdentitySlotPickerModalProps {
  isOpen: boolean
  identityId: string
  identityIsActive: boolean
  slotIndex: 0 | 1 | 2
  onClose: () => void

  currentSlot: IdentitySlotResolved | null

  onAssignHabit: (habitId: string) => Promise<void>
  onAssignGoal: (goalId: string) => Promise<void>
}

type PickerMode = 'habit' | 'goal'

export function IdentitySlotPickerModal({
  isOpen,
  identityId,
  identityIsActive,
  slotIndex,
  onClose,
  currentSlot,
  onAssignHabit,
  onAssignGoal,
}: IdentitySlotPickerModalProps) {
  void identityId

  const { habitsWithStreaks } = useHabits()
  const { goals, createGoal } = useGoals()

  const initialMode: PickerMode = currentSlot?.item_type === 'habit' ? 'habit' : 'goal'
  const [mode, setMode] = useState<PickerMode>(initialMode)
  const [selectedHabitId, setSelectedHabitId] = useState<string>('')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [createGoalOpen, setCreateGoalOpen] = useState(false)

  const habitOptions = useMemo(
    () =>
      habitsWithStreaks.map((h) => ({
        value: h.id,
        label: h.name,
      })),
    [habitsWithStreaks],
  )

  const goalOptions = useMemo(
    () =>
      goals.map((g) => ({
        value: g.id,
        label: g.name,
      })),
    [goals],
  )

  const slotTitle = `Slot ${slotIndex + 1}`

  const handleAssignHabit = async () => {
    if (!selectedHabitId) return
    await onAssignHabit(selectedHabitId)
    onClose()
  }

  const handleAssignGoal = async () => {
    if (!selectedGoalId) return
    await onAssignGoal(selectedGoalId)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-body font-semibold text-bonsai-brown-700">Assign {slotTitle}</h2>
          <p className="text-secondary text-bonsai-slate-600 text-xs mt-0.5">
            {identityIsActive ? 'Choose a habit or goal to activate.' : 'This identity is passive. Goals will be archived.'}
          </p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'habit' ? (
            <Button variant="primary" onClick={handleAssignHabit} disabled={!selectedHabitId}>
              Link habit
            </Button>
          ) : (
            <Button variant="primary" onClick={handleAssignGoal} disabled={!selectedGoalId}>
              Add goal
            </Button>
          )}
        </div>
      }
      fullScreenOnMobile
    >
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === 'habit' ? 'primary' : 'secondary'}
            onClick={() => setMode('habit')}
            size="sm"
          >
            Habit
          </Button>
          <Button
            type="button"
            variant={mode === 'goal' ? 'primary' : 'secondary'}
            onClick={() => setMode('goal')}
            size="sm"
          >
            Goal
          </Button>

          <div className="flex-1" />

          {mode === 'goal' && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreateGoalOpen(true)}>
              Create new goal
            </Button>
          )}
        </div>

        {/* Habit picker */}
        {mode === 'habit' && (
          <div>
            <Select
              label="Select a habit"
              options={[
                { value: '', label: 'Select a habit...' },
                ...habitOptions,
              ]}
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
            />
            {habitOptions.length === 0 && (
              <p className="text-secondary text-bonsai-slate-500 mt-2">No habits available yet.</p>
            )}
          </div>
        )}

        {/* Goal picker */}
        {mode === 'goal' && (
          <div>
            <Select
              label="Select a goal"
              options={[
                { value: '', label: 'Select a goal...' },
                ...goalOptions,
              ]}
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
            />
            {goalOptions.length === 0 && (
              <p className="text-secondary text-bonsai-slate-500 mt-2">No goals available yet.</p>
            )}
          </div>
        )}
      </div>

      <AddEditGoalModal
        isOpen={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        onCreateGoal={async (input) => {
          const created = await createGoal({
            ...input,
            is_active: identityIsActive,
          })
          // Create + assign to this slot.
          await onAssignGoal(created.id)
          setCreateGoalOpen(false)
          onClose()
          return created
        }}
        forceIsActive={identityIsActive}
        hideIsActiveToggle
      />
    </Modal>
  )
}

