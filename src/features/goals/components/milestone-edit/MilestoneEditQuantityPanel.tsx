/* MilestoneEditQuantityPanel: Progress log with stepper and bar for quantity milestones */
import { useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { getNumberMilestoneProgressPercent } from '../../utils/milestoneProgress'
import { getNumberMilestoneRemaining } from '../../utils/numberMilestone'
import type { GoalMilestone } from '../../types'

interface MilestoneEditQuantityPanelProps {
  startValue: number | null
  targetValue: number | null
  currentValue: number
  unit: string | null
  onCurrentChange: (value: number) => void
}

/**
 * Edit-mode progress log: current/target display, stepper, and progress bar.
 */
export function MilestoneEditQuantityPanel({
  startValue,
  targetValue,
  currentValue,
  unit,
  onCurrentChange,
}: MilestoneEditQuantityPanelProps) {
  /* Synthetic milestone for shared progress helpers */
  const progressMilestone: GoalMilestone = {
    id: '',
    goal_id: '',
    type: 'number',
    title: '',
    description: null,
    start_value: startValue,
    target_value: targetValue,
    current_value: currentValue,
    unit,
    completed: false,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  }

  const percent = getNumberMilestoneProgressPercent(progressMilestone)
  const remaining = getNumberMilestoneRemaining(startValue, targetValue, currentValue)
  const unitLabel = unit?.trim() ? ` ${unit.trim()}` : ''
  const targetDisplay =
    targetValue != null ? targetValue.toLocaleString() : '—'
  const currentDisplay = currentValue.toLocaleString()
  const remainingDisplay = remaining.toLocaleString()

  /* Editable stepper value: local draft while focused; prop value when not editing */
  const [inputValue, setInputValue] = useState(String(currentValue))
  const [isInputFocused, setIsInputFocused] = useState(false)

  const commitInputValue = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed === '.') {
      onCurrentChange(0)
      setInputValue('0')
      return
    }

    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed)) {
      setInputValue(String(currentValue))
      return
    }

    const normalized = Math.max(0, parsed)
    onCurrentChange(normalized)
    setInputValue(String(normalized))
  }

  const handleDecrement = () => {
    const nextValue = Math.max(0, currentValue - 1)
    setInputValue(String(nextValue))
    onCurrentChange(nextValue)
  }

  const handleIncrement = () => {
    const nextValue = currentValue + 1
    setInputValue(String(nextValue))
    onCurrentChange(nextValue)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    if (next !== '' && !/^\d*\.?\d*$/.test(next)) return

    setInputValue(next)
    if (next === '' || next === '.') return

    const parsed = parseFloat(next)
    if (!Number.isNaN(parsed)) {
      onCurrentChange(Math.max(0, parsed))
    }
  }

  const handleInputFocus = () => {
    setInputValue(String(currentValue))
    setIsInputFocused(true)
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
    commitInputValue(inputValue)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  return (
    <div className="min-w-0 space-y-4 overflow-hidden rounded-lg bg-surface-container-low p-4 md:space-y-6 md:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-outline">
            Progress Log
          </label>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span className="break-all text-2xl font-bold text-primary lg:text-3xl">
              {currentDisplay}
            </span>
            <span className="text-secondary break-all text-on-surface-variant">
              / {targetDisplay}
              {unitLabel}
            </span>
          </div>
        </div>

        {/* Stepper: decrement / increment current value */}
        <div className="flex w-full min-w-0 shrink-0 items-center self-stretch rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-1 sm:w-auto sm:self-auto">
          <button
            type="button"
            onClick={handleDecrement}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-all hover:bg-surface-container active:scale-90"
            aria-label="Decrease progress"
          >
            <MaterialIcon name="remove" />
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={isInputFocused ? inputValue : String(currentValue)}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            aria-label="Current progress value"
            className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-2 text-center text-base font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 sm:min-w-[3rem] sm:max-w-[8rem] sm:flex-none sm:px-4 sm:text-lg"
          />
          <button
            type="button"
            onClick={handleIncrement}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-container text-on-primary transition-all hover:opacity-90 active:scale-90"
            aria-label="Increase progress"
          >
            <MaterialIcon name="add" />
          </button>
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="min-w-0 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-outline">
          <span className="min-w-0 break-words">{percent}% Complete</span>
          <span className="min-w-0 break-words text-right">{remainingDisplay} Remaining</span>
        </div>
      </div>
    </div>
  )
}
