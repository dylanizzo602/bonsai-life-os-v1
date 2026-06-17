/* MilestoneTrackingTypeSelector: Segmented control for milestone tracking type */
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { GoalMilestoneType } from '../types'

interface MilestoneTrackingTypeSelectorProps {
  value: GoalMilestoneType
  onChange: (type: GoalMilestoneType) => void
  disabled?: boolean
}

const OPTIONS: {
  value: GoalMilestoneType
  label: string
  icon: string
}[] = [
  { value: 'task', label: 'Tasks', icon: 'checklist' },
  { value: 'boolean', label: 'Checkmark', icon: 'check_circle' },
  { value: 'number', label: 'Quantity', icon: 'show_chart' },
]

/**
 * Segmented control for picking milestone tracking type (Tasks / Checkmark / Quantity).
 */
export function MilestoneTrackingTypeSelector({
  value,
  onChange,
  disabled = false,
}: MilestoneTrackingTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-secondary font-semibold tracking-wide text-on-surface-variant">
        Tracking Type
      </label>
      <div className="flex gap-1 rounded-lg bg-surface-container-low p-1">
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-secondary transition-all ${
                isActive
                  ? 'bg-primary font-semibold text-on-primary shadow-sm'
                  : 'font-medium text-on-surface-variant hover:bg-surface-container-high'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <MaterialIcon name={opt.icon} className="text-[18px]" />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
