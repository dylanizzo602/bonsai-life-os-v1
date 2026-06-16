/* InactiveGoalRow: compact horizontal row for paused or scheduled goals */
import { MaterialIcon } from '../../components/MaterialIcon'
import type { Goal } from './types'
import { getInactiveGoalStatus, isGoalScheduled } from './utils/goalDisplay'

interface InactiveGoalRowProps {
  /** Inactive goal to display */
  goal: Goal
  /** Open goal detail for editing */
  onOpen: (goalId: string) => void
  /** Resume a paused goal (sets is_active true) */
  onResume: (goalId: string) => void
}

/**
 * Horizontal inactive goal row with status subtitle and resume or edit action.
 */
export function InactiveGoalRow({ goal, onOpen, onResume }: InactiveGoalRowProps) {
  const scheduled = isGoalScheduled(goal)
  const statusLine = getInactiveGoalStatus(goal)

  /* Trailing action: scheduled goals open edit; paused goals resume */
  const handleAction = () => {
    if (scheduled) {
      onOpen(goal.id)
    } else {
      onResume(goal.id)
    }
  }

  return (
    <div className="group flex items-center rounded-lg border border-outline-variant/20 bg-surface-container-low p-6 transition-colors hover:bg-surface-container-high">
      {/* Status icon */}
      <MaterialIcon
        name={scheduled ? 'schedule' : 'pause_circle'}
        className="mr-4 text-[28px] text-outline-variant transition-colors group-hover:text-outline"
      />

      {/* Title and status */}
      <div className="min-w-0 flex-grow">
        <h4 className="text-body font-semibold text-on-surface-variant">{goal.name}</h4>
        <p className="mt-0.5 text-xs uppercase text-outline">{statusLine}</p>
      </div>

      {/* Resume or edit */}
      <button
        type="button"
        onClick={handleAction}
        className="shrink-0 rounded-full p-2 text-outline transition-colors hover:bg-surface-container hover:text-primary"
        aria-label={scheduled ? `Edit goal: ${goal.name}` : `Resume goal: ${goal.name}`}
      >
        <MaterialIcon
          name={scheduled ? 'edit' : 'play_arrow'}
          className="text-[20px]"
        />
      </button>
    </div>
  )
}
