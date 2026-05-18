/* AddEditHabitModal: Create/Edit habit with name, desired action, minimum action, frequency, add-to-todos reminder time, color */

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
  { value: 'monthly', label: 'Monthly' },
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

/** Day-of-month options for monthly frequency: 1..31 plus last (-1) */
const DAYS_OF_MONTH: { value: number; label: string }[] = [
  { value: -1, label: 'Last day' },
  ...Array.from({ length: 31 }, (_, i) => {
    const d = i + 1
    const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'
    return { value: d, label: `${d}${suffix}` }
  }),
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
  /* Form state: main habit fields */
  const [name, setName] = useState('')
  const [desiredAction, setDesiredAction] = useState('')
  const [minimumAction, setMinimumAction] = useState('')
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [frequencyTarget, setFrequencyTarget] = useState<number | ''>(1)
  /* Form state: monthly schedule fields (interval + day-of-month) */
  const [monthlyInterval, setMonthlyInterval] = useState(1)
  const [monthlyDay, setMonthlyDay] = useState<number>(1)
  const [addToTodos, setAddToTodos] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  /* Form state: additional reminder offsets relative to reminderTime */
  const [additionalReminderOffsets, setAdditionalReminderOffsets] = useState<number[]>([])
  const [color, setColor] = useState<HabitColorId>('green')
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isEditMode = !!habit

  /* Sync form state when modal opens or habit (edit) changes */
  useEffect(() => {
    if (isOpen) {
      if (habit) {
        setName(habit.name)
        setDesiredAction(habit.desired_action ?? '')
        setMinimumAction(habit.minimum_action ?? '')
        /* Frequency normalization: allow daily/weekly/monthly; map other legacy codes to daily */
        const freq =
          habit.frequency === 'weekly' || habit.frequency === 'monthly'
            ? habit.frequency
            : 'daily'
        setFrequency(freq)
        /* For weekly, frequency_target is a day-of-week bitmask; default to Monday (2) if null/invalid */
        if (freq === 'weekly') {
          const v = habit.frequency_target
          setFrequencyTarget(
            typeof v === 'number' && v >= 1 && v <= 127 ? v : 2
          )
        } else if (freq === 'monthly') {
          setFrequencyTarget('')
          /* Monthly interval/day: keep safe defaults when missing/invalid */
          const interval =
            typeof habit.monthly_interval === 'number' && Number.isFinite(habit.monthly_interval)
              ? Math.max(1, Math.trunc(habit.monthly_interval))
              : 1
          const dayRaw =
            typeof habit.monthly_day === 'number' && Number.isFinite(habit.monthly_day)
              ? Math.trunc(habit.monthly_day)
              : 1
          const day = dayRaw === -1 ? -1 : Math.max(1, Math.min(31, dayRaw))
          setMonthlyInterval(interval)
          setMonthlyDay(day)
        } else {
          setFrequencyTarget('')
          setMonthlyInterval(1)
          setMonthlyDay(1)
        }
        setAddToTodos(habit.add_to_todos)
        setReminderTime(habit.reminder_time ?? '09:00')
        /* Additional reminders: coerce null to empty array and filter out zero offsets */
        setAdditionalReminderOffsets(
          (habit.additional_reminder_offsets_mins ?? []).filter((x) => typeof x === 'number' && x !== 0),
        )
        setColor(habit.color)
        setDeleteConfirm(false)
      } else {
        setName('')
        setDesiredAction('')
        setMinimumAction('')
        setFrequency('daily')
        setFrequencyTarget(1)
        setMonthlyInterval(1)
        setMonthlyDay(1)
        setAddToTodos(true)
        setReminderTime('09:00')
        setAdditionalReminderOffsets([])
        setColor('green')
      }
    }
  }, [isOpen, habit])

  /* Additional reminders helpers: add/update/remove offsets */
  const addOffset = () => {
    setAdditionalReminderOffsets((prev) => [...prev, -30])
  }
  const updateOffset = (idx: number, next: number) => {
    setAdditionalReminderOffsets((prev) => prev.map((v, i) => (i === idx ? next : v)))
  }
  const removeOffset = (idx: number) => {
    setAdditionalReminderOffsets((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    /* Validation: habit requires a name and a target action */
    if (!name.trim()) return
    if (!desiredAction.trim()) return
    /* For weekly, frequency_target is day-of-week bitmask (1-127); for daily it is null */
    const numTarget: number | null =
      frequency === 'weekly'
        ? (typeof frequencyTarget === 'number' && frequencyTarget >= 1 && frequencyTarget <= 127
            ? frequencyTarget
            : 2)
        : null
    /* For monthly, clamp interval/day to safe ranges and store explicitly */
    const monthlyIntervalSafe = Math.max(1, Math.min(12, Math.trunc(monthlyInterval || 1)))
    const monthlyDaySafe =
      monthlyDay === -1 ? -1 : Math.max(1, Math.min(31, Math.trunc(monthlyDay || 1)))
    const input: CreateHabitInput | UpdateHabitInput = {
      name: name.trim(),
      desired_action: desiredAction.trim() || null,
      minimum_action: minimumAction.trim() || null,
      frequency,
      frequency_target: numTarget,
      monthly_interval: frequency === 'monthly' ? monthlyIntervalSafe : undefined,
      monthly_day: frequency === 'monthly' ? monthlyDaySafe : undefined,
      add_to_todos: addToTodos,
      reminder_time: addToTodos ? reminderTime : null,
      additional_reminder_offsets_mins: addToTodos ? additionalReminderOffsets : [],
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
            disabled={submitting || !name.trim() || !desiredAction.trim()}
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

        {/* Target action: full/ideal action description */}
        <div>
          <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
            Target action
          </label>
          <textarea
            value={desiredAction}
            onChange={(e) => setDesiredAction(e.target.value)}
            placeholder="Describe the action you're aiming for (e.g., Run 3 miles, Meditate 10 minutes)"
            rows={2}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
          />
        </div>

        {/* Minimum action (optional): smallest version that still counts (Habits 1.1 minimum status) */}
        <div>
          <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
            Minimum action (optional)
          </label>
          <textarea
            value={minimumAction}
            onChange={(e) => setMinimumAction(e.target.value)}
            placeholder="The smallest version that still counts (e.g., Put on running shoes, Sit down to meditate)"
            rows={2}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
          />
          <p className="text-secondary text-bonsai-slate-500 mt-1">
            If set, marking &quot;minimum&quot; uses this; full completion uses the target action.
          </p>
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
                  /* When switching to monthly, ensure safe defaults exist */
                  if (opt.value === 'monthly') {
                    setFrequencyTarget('')
                    setMonthlyInterval((v) => Math.max(1, Math.trunc(v || 1)))
                    setMonthlyDay((v) => (v === -1 ? -1 : Math.max(1, Math.min(31, Math.trunc(v || 1)))))
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
          {/* Monthly: interval + day-of-month (stored in monthly_interval/monthly_day) */}
          {frequency === 'monthly' && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Monthly interval: every N months */}
              <div>
                <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
                  Every
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  value={monthlyInterval}
                  onChange={(e) => {
                    const next = Math.max(1, Math.min(12, Math.trunc(Number(e.target.value) || 1)))
                    setMonthlyInterval(next)
                  }}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body bg-white"
                />
                <p className="text-secondary text-bonsai-slate-500 mt-1">
                  Month{monthlyInterval === 1 ? '' : 's'}
                </p>
              </div>

              {/* Monthly day-of-month: 1st..last */}
              <div>
                <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
                  On
                </label>
                <select
                  value={monthlyDay}
                  onChange={(e) => {
                    const raw = Math.trunc(Number(e.target.value))
                    const next = raw === -1 ? -1 : Math.max(1, Math.min(31, raw))
                    setMonthlyDay(next)
                  }}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body bg-white"
                >
                  {DAYS_OF_MONTH.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-secondary text-bonsai-slate-500 mt-1">
                  If the month is shorter, it will use the last day of that month.
                </p>
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

              {/* Additional reminders: offsets relative to the main reminder time */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-secondary font-medium text-bonsai-slate-700">
                    Additional reminders
                  </p>
                  <Button
                    variant="secondary"
                    onClick={addOffset}
                    disabled={submitting}
                  >
                    + Add
                  </Button>
                </div>
                <p className="text-secondary text-bonsai-slate-500 mt-1">
                  The first time above is the main due time shown on the habit. These extras can notify before or after.
                </p>

                {additionalReminderOffsets.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {additionalReminderOffsets.map((offset, idx) => {
                      const direction = offset < 0 ? 'before' : 'after'
                      const minutes = Math.abs(offset)
                      return (
                        <div
                          key={`${idx}-${offset}`}
                          className="flex flex-col gap-2 rounded-lg border border-bonsai-slate-200 bg-white p-3 md:flex-row md:items-end"
                        >
                          {/* Offset minutes: numeric input */}
                          <div className="flex-1">
                            <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
                              Minutes
                            </label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={minutes}
                              onChange={(e) => {
                                const nextMinutes = Math.max(1, Math.trunc(Number(e.target.value) || 0))
                                const sign = direction === 'before' ? -1 : 1
                                updateOffset(idx, sign * nextMinutes)
                              }}
                              className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
                            />
                          </div>

                          {/* Offset direction: before/after select */}
                          <div className="flex-1">
                            <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
                              Timing
                            </label>
                            <select
                              value={direction}
                              onChange={(e) => {
                                const nextDirection = e.target.value === 'before' ? 'before' : 'after'
                                const sign = nextDirection === 'before' ? -1 : 1
                                updateOffset(idx, sign * Math.max(1, minutes))
                              }}
                              className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body bg-white"
                            >
                              <option value="before">Before</option>
                              <option value="after">After</option>
                            </select>
                          </div>

                          {/* Remove button */}
                          <div className="md:pb-[1px]">
                            <Button
                              variant="danger"
                              onClick={() => removeOffset(idx)}
                              disabled={submitting}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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
