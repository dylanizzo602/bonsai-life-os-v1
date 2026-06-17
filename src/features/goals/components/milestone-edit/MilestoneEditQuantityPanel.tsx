/* MilestoneEditQuantityPanel: Progress log with stepper and bar for quantity milestones */
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
  const targetDisplay = targetValue ?? '—'

  const handleDecrement = () => {
    onCurrentChange(Math.max(0, currentValue - 1))
  }

  const handleIncrement = () => {
    onCurrentChange(currentValue + 1)
  }

  return (
    <div className="space-y-6 rounded-lg bg-surface-container-low p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-outline">
            Progress Log
          </label>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-primary">{currentValue}</span>
            <span className="text-secondary text-on-surface-variant">
              / {targetDisplay}
              {unitLabel}
            </span>
          </div>
        </div>

        {/* Stepper: decrement / increment current value */}
        <div className="flex items-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-1">
          <button
            type="button"
            onClick={handleDecrement}
            className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant transition-all hover:bg-surface-container active:scale-90"
            aria-label="Decrease progress"
          >
            <MaterialIcon name="remove" />
          </button>
          <div className="min-w-[3rem] px-4 text-center text-lg font-semibold">{currentValue}</div>
          <button
            type="button"
            onClick={handleIncrement}
            className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-container text-on-primary-container transition-all hover:opacity-90 active:scale-90"
            aria-label="Increase progress"
          >
            <MaterialIcon name="add" />
          </button>
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-outline">
          <span>{percent}% Complete</span>
          <span>{remaining} Remaining</span>
        </div>
      </div>
    </div>
  )
}
