/* BriefingMilestoneRow: Clickable milestone row for goal review step */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { getMilestoneProgressPercent } from '../../goals/utils/milestoneProgress'
import type { GoalMilestone } from '../../goals/types'
import type { Task } from '../../tasks/types'

interface BriefingMilestoneRowProps {
  milestone: GoalMilestone
  taskTree?: Task[]
  onClick: () => void
}

/**
 * Milestone row for Sunday goal review — opens the update milestone modal on click.
 */
export function BriefingMilestoneRow({
  milestone,
  taskTree,
  onClick,
}: BriefingMilestoneRowProps) {
  const progress = getMilestoneProgressPercent(milestone, taskTree)
  const isComplete = progress >= 100

  /* Number milestones: show current / target under the title */
  const numberProgressLabel =
    milestone.type === 'number' && milestone.target_value != null
      ? `${milestone.current_value ?? milestone.start_value ?? 0} / ${milestone.target_value}${
          milestone.unit ? ` ${milestone.unit}` : ''
        }`
      : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-transparent bg-surface-container-low p-4 text-left transition-all hover:border-outline-variant/30 md:gap-4 md:p-5"
      aria-label={`Update milestone: ${milestone.title}`}
    >
      {isComplete ? (
        <MaterialIcon name="check_circle" className="shrink-0 text-primary" filled />
      ) : (
        <span
          className="h-6 w-6 shrink-0 rounded-full border-2 border-outline-variant"
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-body break-words font-medium text-on-surface [overflow-wrap:anywhere]">
          {milestone.title}
        </p>
        {numberProgressLabel ? (
          <p className="text-secondary mt-0.5 text-on-surface-variant">{numberProgressLabel}</p>
        ) : null}
      </div>
      <MaterialIcon name="chevron_right" className="shrink-0 text-on-surface-variant" />
    </button>
  )
}
