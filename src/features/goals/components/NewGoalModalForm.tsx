/* NewGoalModalForm: Material create-goal form body for AddEditGoalModal */
import { useRef, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { GoalIconPicker } from './GoalIconPicker'
import { GoalDateRangeChip } from './GoalDateRangeChip'
import { GoalCategoryChip } from './GoalCategoryChip'
import {
  GoalMilestoneDraftList,
  type GoalMilestoneDraftListHandle,
} from './GoalMilestoneDraftList'
import { GoalHabitLinkDraft } from './GoalHabitLinkDraft'
import { DEFAULT_GOAL_ICON } from '../utils/goalCategories'
import type { CreateGoalInput, Goal, GoalCategory } from '../types'
import type { CreateGoalSetupOptions } from '../hooks/useGoals'

export interface NewGoalModalFormProps {
  onSubmit: (
    input: CreateGoalInput,
    setup: CreateGoalSetupOptions,
  ) => Promise<Goal>
  onClose: () => void
  submitting: boolean
  setSubmitting: (value: boolean) => void
  /** When set, force is_active on create (identity slot flow) */
  forceIsActive?: boolean
}

/**
 * Create-goal form matching the Material mock: icon, chips, milestones, habits.
 */
export function NewGoalModalForm({
  onSubmit,
  onClose,
  submitting,
  setSubmitting,
  forceIsActive,
}: NewGoalModalFormProps) {
  const milestoneListRef = useRef<GoalMilestoneDraftListHandle>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [iconName, setIconName] = useState<string>(DEFAULT_GOAL_ICON)
  const [category, setCategory] = useState<GoalCategory | null>(null)
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [milestoneTitles, setMilestoneTitles] = useState<string[]>([''])
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([])

  const datesInvalid = Boolean(startDate && targetDate && startDate > targetDate)
  const isValid = name.trim().length > 0 && !datesInvalid

  const handleSubmit = async () => {
    if (!isValid || submitting) return

    const input: CreateGoalInput = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate.trim() || null,
      target_date: targetDate.trim() || null,
      icon_name: iconName,
      category,
      is_active: typeof forceIsActive === 'boolean' ? forceIsActive : true,
    }

    const setup: CreateGoalSetupOptions = {
      milestoneTitles: milestoneTitles,
      habitIds: selectedHabitIds,
    }

    try {
      setSubmitting(true)
      await onSubmit(input, setup)
      onClose()
    } catch {
      /* Parent / hook surfaces error */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable form sections */}
      <div className="relative flex-1 space-y-10 overflow-y-auto px-8 py-8 scrollbar-hide">
        {/* Title + icon + metadata chips */}
        <section className="space-y-6">
          <div className="group flex items-center gap-4">
            <GoalIconPicker value={iconName} onChange={setIconName} />
            <div className="relative min-w-0 flex-1">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Goal Title"
                className="w-full border-0 border-b-2 border-outline-variant/30 bg-transparent px-0 pb-2 text-page-title font-semibold text-on-surface placeholder:text-on-surface-variant/30 transition-all duration-300 focus:border-primary focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <GoalDateRangeChip
              startDate={startDate}
              targetDate={targetDate}
              onStartDateChange={setStartDate}
              onTargetDateChange={setTargetDate}
            />
            <GoalCategoryChip value={category} onChange={setCategory} />
            <button
              type="button"
              onClick={() => milestoneListRef.current?.focusFirst()}
              className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface-variant transition-all hover:bg-surface-container-high"
            >
              <MaterialIcon name="flag" className="text-lg" />
              <span>Initial Milestone</span>
            </button>
          </div>
        </section>

        {/* Description */}
        <section className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
            <MaterialIcon name="visibility" className="text-sm" />
            Description &amp; Vision
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the outcome you want to achieve..."
            rows={3}
            className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 text-body text-on-surface transition-all placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </section>

        <GoalMilestoneDraftList
          ref={milestoneListRef}
          titles={milestoneTitles}
          onChange={setMilestoneTitles}
        />

        <GoalHabitLinkDraft
          selectedHabitIds={selectedHabitIds}
          onChange={setSelectedHabitIds}
        />

        {datesInvalid && (
          <p className="text-secondary text-error" role="alert">
            Target date must be on or after start date
          </p>
        )}

        {/* Decorative bonsai (desktop) */}
        <img
          src="/goals/trees/tree-1.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-8 top-24 hidden h-32 w-32 object-contain opacity-10 md:block"
        />
      </div>

      {/* Sticky footer */}
      <footer className="shrink-0 border-t border-outline-variant/10 bg-surface-container-lowest px-8 py-6">
        <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg px-6 py-2.5 font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !isValid}
          className="rounded-lg bg-primary px-8 py-2.5 font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Goal'}
        </button>
        </div>
      </footer>
    </div>
  )
}
