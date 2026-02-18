/* AddEditHabitModal: Create/Edit habit with name, description, frequency, add-to-todos reminder time, color */

import { useState, useEffect } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import type {
  Habit,
  HabitFrequency,
  HabitColorId,
  CreateHabitInput,
  UpdateHabitInput,
} from './types'

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

/** Day-of-week for weekly frequency: 0=Sun … 6=Sat; stored as bitmask in frequency_target (1<<d) */
const DAYS_OF_WEEK: { value: number; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const COLOR_OPTIONS: HabitColorId[] = [
  'orange',
  'yellow',
  'green',
  'light_blue',
  'dark_blue',
  'purple',
  'pink',
  'red',
  'grey',
]

/** Tailwind/bonsai classes for habit color swatches (filled square) */
const COLOR_CLASSES: Record<HabitColorId, string> = {
  orange: 'bg-orange-400',
  yellow: 'bg-amber-400',
  green: 'bg-bonsai-sage-500',
  light_blue: 'bg-sky-400',
  dark_blue: 'bg-blue-600',
  purple: 'bg-violet-500',
  pink: 'bg-pink-400',
  red: 'bg-red-500',
  grey: 'bg-bonsai-slate-400',
}

export interface AddEditHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateHabit?: (input: CreateHabitInput) => Promise<Habit>
  onUpdateHabit?: (id: string, input: UpdateHabitInput) => Promise<Habit>
  onDeleteHabit?: (id: string) => Promise<void>
  habit?: Habit | null
}

/**
 * Add/Edit habit modal: name, description, frequency, add-to-todos with time, color.
 * Footer: Cancel (create) / Delete (edit with confirm), Create Habit / Save Changes (edit).
 */
export function AddEditHabitModal({
  isOpen,
  onClose,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  habit = null,
}: AddEditHabitModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [frequencyTarget, setFrequencyTarget] = useState<number | ''>(1)
  const [addToTodos, setAddToTodos] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [color, setColor] = useState<HabitColorId>('green')
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isEditMode = !!habit

  /* Sync form state when modal opens or habit (edit) changes */
  useEffect(() => {
    if (isOpen) {
      if (habit) {
        setName(habit.name)
        setDescription(habit.description ?? '')
        /* Only daily and weekly are offered; map legacy frequencies to daily */
        const freq = habit.frequency === 'weekly' ? 'weekly' : 'daily'
        setFrequency(freq)
        /* For weekly, frequency_target is a day-of-week bitmask; default to Monday (2) if null/invalid */
        if (freq === 'weekly') {
          const v = habit.frequency_target
          setFrequencyTarget(
            typeof v === 'number' && v >= 1 && v <= 127 ? v : 2
          )
        } else {
          setFrequencyTarget('')
        }
        setAddToTodos(habit.add_to_todos)
        setReminderTime(habit.reminder_time ?? '09:00')
        setColor(habit.color)
        setDeleteConfirm(false)
      } else {
        setName('')
        setDescription('')
        setFrequency('daily')
        setFrequencyTarget(1)
        setAddToTodos(false)
        setReminderTime('09:00')
        setColor('green')
      }
    }
  }, [isOpen, habit])

  const handleSubmit = async () => {
    if (!name.trim()) return
    /* For weekly, frequency_target is day-of-week bitmask (1-127); for daily it is null */
    const numTarget: number | null =
      frequency === 'weekly'
        ? (typeof frequencyTarget === 'number' && frequencyTarget >= 1 && frequencyTarget <= 127
            ? frequencyTarget
            : 2)
        : null
    const input: CreateHabitInput | UpdateHabitInput = {
      name: name.trim(),
      description: description.trim() || null,
      frequency,
      frequency_target: numTarget,
      add_to_todos: addToTodos,
      reminder_time: addToTodos ? reminderTime : null,
      color,
    }
    try {
      setSubmitting(true)
      if (isEditMode && onUpdateHabit) {
        await onUpdateHabit(habit.id, input)
      } else if (!isEditMode && onCreateHabit) {
        await onCreateHabit(input as CreateHabitInput)
      }
      onClose()
    } catch {
      // Error handled by parent / useHabits
    } finally {
      setSubmitting(false)
    }
  }

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
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const titleNode = (
    <div>
      <h2 className="text-body font-semibold text-bonsai-brown-700">
        {isEditMode ? 'Edit Habit' : 'Create New Habit'}
      </h2>
      <p className="text-secondary text-bonsai-slate-500 mt-0.5">
        Build lasting change through consistency
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
            disabled={submitting || !name.trim()}
          >
            {isEditMode ? 'Save Changes' : 'Create Habit'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Habit details */}
        <Input
          label="Habit Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Morning meditation, Drink water, Exercise"
        />
        <div>
          <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes or context about this habit..."
            rows={3}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
          />
        </div>

        {/* Frequency */}
        <div>
          <h3 className="text-secondary font-medium text-bonsai-slate-700 mb-2">Frequency</h3>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFrequency(opt.value)
                  /* When switching to weekly, default to Monday (2) if current value isn't a valid weekly bitmask */
                  if (opt.value === 'weekly') {
                    const v = frequencyTarget
                    if (typeof v !== 'number' || v < 0 || v > 127) setFrequencyTarget(2)
                  }
                }}
                className={`py-2 px-3 rounded-lg border text-body font-medium transition-colors ${
                  frequency === opt.value
                    ? 'border-bonsai-sage-500 bg-bonsai-sage-100 text-bonsai-sage-800'
                    : 'border-bonsai-slate-300 bg-white text-bonsai-slate-700 hover:bg-bonsai-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Weekly: day-of-week checkboxes (stored as bitmask in frequency_target) */}
          {frequency === 'weekly' && (
            <div className="mt-2">
              <p className="text-secondary font-medium text-bonsai-slate-700 mb-2">
                Which days?
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(({ value: d, label }) => {
                  const mask = typeof frequencyTarget === 'number' && frequencyTarget >= 0 && frequencyTarget <= 127
                    ? frequencyTarget
                    : 2
                  const checked = (mask & (1 << d)) !== 0
                  return (
                    <label
                      key={d}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-bonsai-slate-300 bg-white px-3 py-2 text-body transition-colors has-[:checked]:border-bonsai-sage-500 has-[:checked]:bg-bonsai-sage-100 has-[:checked]:text-bonsai-sage-800 hover:bg-bonsai-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const newMask = mask ^ (1 << d)
                          /* Require at least one day selected */
                          setFrequencyTarget(newMask === 0 ? mask : newMask)
                        }}
                        className="h-4 w-4 rounded border-bonsai-slate-300 text-bonsai-sage-600 focus:ring-bonsai-sage-500"
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Add to todos as a reminder */}
        <div>
          <Checkbox
            label="Add to todos as a reminder"
            checked={addToTodos}
            onChange={(e) => setAddToTodos(e.target.checked)}
          />
          <p className="text-secondary text-bonsai-slate-500 mt-1 ml-6">
            Automatically create todo items to help you stay on track
          </p>
          {addToTodos && (
            <div className="mt-2 ml-6">
              <Input
                type="time"
                label="Reminder time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Habit color */}
        <div>
          <h3 className="text-secondary font-medium text-bonsai-slate-700 mb-2">Habit Color</h3>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg ${COLOR_CLASSES[c]} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bonsai-sage-500 ${
                  color === c ? 'ring-2 ring-offset-2 ring-bonsai-brown-700' : ''
                }`}
                title={c}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <p className="text-secondary text-bonsai-slate-500 mt-1">
            Streak colors will automatically intensify as you build consistency
          </p>
        </div>
      </div>
    </Modal>
  )
}
