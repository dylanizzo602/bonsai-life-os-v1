/* MilestoneEditCheckmarkPanel: Completion toggle card for checkmark milestones */
import { MaterialIcon } from '../../../../components/MaterialIcon'

interface MilestoneEditCheckmarkPanelProps {
  completed: boolean
  onToggle: (completed: boolean) => void
}

/**
 * Large completion toggle for boolean milestone edit mode.
 */
export function MilestoneEditCheckmarkPanel({
  completed,
  onToggle,
}: MilestoneEditCheckmarkPanelProps) {
  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold uppercase tracking-widest text-outline">
        Completion Status
      </label>
      <button
        type="button"
        onClick={() => onToggle(!completed)}
        className="group flex w-full cursor-pointer items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 transition-all hover:bg-surface-container active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-sm transition-colors ${
              completed
                ? 'bg-primary text-on-primary'
                : 'border-2 border-outline-variant bg-surface-container-lowest text-transparent'
            }`}
          >
            {completed ? (
              <MaterialIcon name="check" className="text-2xl" style={{ fontWeight: 600 }} />
            ) : null}
          </div>
          <span
            className={`text-lg font-semibold ${
              completed ? 'text-primary' : 'text-on-surface'
            }`}
          >
            Mark as Complete
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-bold uppercase tracking-tighter text-outline-variant">
            Status
          </span>
          <span
            className={`text-sm font-medium ${
              completed ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {completed ? 'Complete' : 'Active'}
          </span>
        </div>
      </button>
    </div>
  )
}
