/* HabitModalForm: Material create/edit habit form body for AddEditHabitModal */

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { getGoals, getLinkedGoalIdForHabit, linkHabitToGoal, unlinkHabitFromGoal } from '../../../lib/supabase/goals'
import type { Goal } from '../../goals/types'
import type {
  Habit,
  HabitColorId,
  HabitFrequency,
  CreateHabitInput,
  UpdateHabitInput,
} from '../types'
import { HabitIconPicker } from './HabitIconPicker'
import { HabitFrequencySelector } from './HabitFrequencySelector'
import { HabitReminderList } from './HabitReminderList'
import { DEFAULT_HABIT_ICON, HABIT_COLOR_SWATCHES } from '../utils/habitDisplay'
import {
  buildReminderTimeList,
  reminderTimesToStorage,
} from '../utils/habitReminders'

export interface HabitModalFormProps {
  habit?: Habit | null
  onCreateHabit?: (input: CreateHabitInput) => Promise<Habit>
  onUpdateHabit?: (id: string, input: UpdateHabitInput) => Promise<Habit>
  onClose: () => void
  submitting: boolean
  setSubmitting: (value: boolean) => void
}

/**
 * Create/edit habit form matching the Material mock.
 */
export function HabitModalForm({
  habit = null,
  onCreateHabit,
  onUpdateHabit,
  onClose,
  submitting,
  setSubmitting,
}: HabitModalFormProps) {
  const isEditMode = !!habit

  /* Form state */
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState(DEFAULT_HABIT_ICON)
  const [desiredAction, setDesiredAction] = useState('')
  const [minimumAction, setMinimumAction] = useState('')
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [frequencyTarget, setFrequencyTarget] = useState(62)
  const [monthlyInterval, setMonthlyInterval] = useState(1)
  const [monthlyDay, setMonthlyDay] = useState(1)
  const [reminderTimes, setReminderTimes] = useState<string[]>(['09:00'])
  const [color, setColor] = useState<HabitColorId>('green')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [initialGoalId, setInitialGoalId] = useState<string>('')
  const [goals, setGoals] = useState<Goal[]>([])

  /* Load goals for link dropdown */
  useEffect(() => {
    if (!habit) return
    void getLinkedGoalIdForHabit(habit.id)
      .then((goalId) => {
        const id = goalId ?? ''
        setSelectedGoalId(id)
        setInitialGoalId(id)
      })
      .catch(() => {
        setSelectedGoalId('')
        setInitialGoalId('')
      })
  }, [habit])

  useEffect(() => {
    void getGoals()
      .then((list) => setGoals(list.filter((g) => g.is_active !== false)))
      .catch(() => setGoals([]))
  }, [])

  /* Sync form when habit changes */
  useEffect(() => {
    if (habit) {
      setName(habit.name)
      setIconName(habit.icon_name || DEFAULT_HABIT_ICON)
      setDesiredAction(habit.desired_action ?? '')
      setMinimumAction(habit.minimum_action ?? '')
      const freq =
        habit.frequency === 'weekly' || habit.frequency === 'monthly' ? habit.frequency : 'daily'
      setFrequency(freq)
      if (freq === 'weekly') {
        const v = habit.frequency_target
        setFrequencyTarget(typeof v === 'number' && v >= 1 && v <= 127 ? v : 62)
      }
      if (freq === 'monthly') {
        setMonthlyInterval(Math.max(1, habit.monthly_interval ?? 1))
        setMonthlyDay(habit.monthly_day ?? 1)
      }
      setColor(habit.color)
      const times = buildReminderTimeList(
        habit.reminder_time,
        habit.additional_reminder_offsets_mins,
      )
      setReminderTimes(times.length > 0 ? times : [])
    } else {
      setName('')
      setIconName(DEFAULT_HABIT_ICON)
      setDesiredAction('')
      setMinimumAction('')
      setFrequency('daily')
      setFrequencyTarget(62)
      setMonthlyInterval(1)
      setMonthlyDay(1)
      setReminderTimes(['09:00'])
      setColor('green')
      setSelectedGoalId('')
      setInitialGoalId('')
    }
  }, [habit])

  const isValid = name.trim().length > 0 && desiredAction.trim().length > 0

  /* Reminder helpers */
  const handleAddReminder = () => {
    setReminderTimes((prev) => [...prev, '12:00'])
  }

  const handleRemoveReminder = (index: number) => {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index))
  }

  /* Persist goal link changes after habit save */
  const syncGoalLink = async (habitId: string) => {
    if (selectedGoalId === initialGoalId) return
    if (initialGoalId) {
      await unlinkHabitFromGoal(initialGoalId, habitId)
    }
    if (selectedGoalId) {
      await linkHabitToGoal(selectedGoalId, habitId)
    }
  }

  const handleSubmit = async () => {
    if (!isValid || submitting) return

    const { reminder_time, additional_reminder_offsets_mins } = reminderTimesToStorage(reminderTimes)
    const hasReminders = reminder_time != null

    const numTarget: number | null =
      frequency === 'weekly' ? frequencyTarget : null

    const input: CreateHabitInput | UpdateHabitInput = {
      name: name.trim(),
      desired_action: desiredAction.trim() || null,
      minimum_action: minimumAction.trim() || null,
      frequency,
      frequency_target: numTarget,
      monthly_interval: frequency === 'monthly' ? monthlyInterval : undefined,
      monthly_day: frequency === 'monthly' ? monthlyDay : undefined,
      add_to_todos: hasReminders,
      reminder_time: hasReminders ? reminder_time : null,
      additional_reminder_offsets_mins: hasReminders ? additional_reminder_offsets_mins : [],
      color,
      icon_name: iconName,
    }

    try {
      setSubmitting(true)
      let saved: Habit
      if (isEditMode && onUpdateHabit && habit) {
        saved = await onUpdateHabit(habit.id, input)
      } else if (!isEditMode && onCreateHabit) {
        saved = await onCreateHabit(input as CreateHabitInput)
      } else {
        return
      }
      await syncGoalLink(saved.id)
      onClose()
    } catch {
      /* Parent / hook surfaces error */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable form body */}
      <div className="flex-1 space-y-12 overflow-y-auto px-8 py-4">
        {/* Basic info: icon, name, goal link, color */}
        <section className="space-y-8">
          <div className="flex items-end gap-6">
            <div className="flex flex-col gap-2">
              <label className="block text-secondary font-bold uppercase tracking-widest text-outline">
                Icon
              </label>
              <HabitIconPicker value={iconName} onChange={setIconName} />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-3 block text-secondary font-bold uppercase tracking-widest text-outline">
                Habit Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Meditation"
                className="w-full border-b-2 border-surface-container-highest bg-transparent px-0 py-3 text-body font-medium text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-secondary font-bold uppercase tracking-widest text-outline">
                Link to Goal
              </label>
              <div className="relative">
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">None</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <MaterialIcon
                  name="expand_more"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-secondary font-bold uppercase tracking-widest text-outline">
                Habit Color
              </label>
              <div className="flex h-11 items-center gap-4">
                {HABIT_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => setColor(swatch.id)}
                    className={`h-7 w-7 rounded-full border-2 border-white transition-transform hover:scale-110 ${swatch.className} ${
                      color === swatch.id
                        ? 'scale-110 ring-4 ring-primary/20 ring-offset-2'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    aria-label={`Color ${swatch.id}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Elastic philosophy: minimum + target */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <MaterialIcon name="flex_direction" className="text-[24px] text-primary" />
            <h3 className="text-body font-bold text-on-surface">Elastic Philosophy</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6 transition-colors hover:border-outline">
              <label className="mb-3 block text-secondary font-bold uppercase tracking-widest text-outline">
                Minimum Action
              </label>
              <input
                type="text"
                value={minimumAction}
                onChange={(e) => setMinimumAction(e.target.value)}
                placeholder="e.g. 1 minute"
                className="w-full border-none bg-transparent p-0 text-body font-medium text-on-surface outline-none placeholder:text-outline-variant focus:ring-0"
              />
              <p className="mt-3 text-secondary italic text-on-surface-variant opacity-70">
                The simplest version of your habit to maintain your streak.
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 transition-colors hover:border-primary/40">
              <label className="mb-3 block text-secondary font-bold uppercase tracking-widest text-primary">
                Target Action
              </label>
              <input
                type="text"
                value={desiredAction}
                onChange={(e) => setDesiredAction(e.target.value)}
                placeholder="e.g. 20 minutes"
                className="w-full border-none bg-transparent p-0 text-body font-medium text-on-surface outline-none placeholder:text-primary/40 focus:ring-0"
              />
            </div>
          </div>
        </section>

        {/* Frequency */}
        <HabitFrequencySelector
          frequency={frequency}
          frequencyTarget={frequencyTarget}
          monthlyInterval={monthlyInterval}
          monthlyDay={monthlyDay}
          onFrequencyChange={(freq) => {
            setFrequency(freq)
            if (freq === 'weekly' && (frequencyTarget < 1 || frequencyTarget > 127)) {
              setFrequencyTarget(62)
            }
          }}
          onFrequencyTargetChange={setFrequencyTarget}
          onMonthlyIntervalChange={setMonthlyInterval}
          onMonthlyDayChange={setMonthlyDay}
        />

        {/* Reminders */}
        <HabitReminderList
          reminderTimes={reminderTimes}
          onAdd={handleAddReminder}
          onRemove={handleRemoveReminder}
        />
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex justify-end gap-4 border-t border-surface-container-highest bg-surface-container-lowest px-8 py-8">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-outline-variant px-8 py-3 text-secondary font-bold text-on-surface transition-colors hover:bg-surface-container"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !isValid}
          className="rounded-lg bg-primary px-10 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-container active:scale-95 disabled:opacity-50"
        >
          {isEditMode ? 'Save Changes' : 'Create Habit'}
        </button>
      </div>
    </div>
  )
}
