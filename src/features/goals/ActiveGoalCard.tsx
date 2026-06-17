/* ActiveGoalCard: Material-style goal card with horizontal progress bar for the list grid */
import { MaterialIcon } from '../../components/MaterialIcon'
import type { Task } from '../tasks/types'
import type { Goal, GoalMilestone } from './types'
import {
  getGoalAccent,
  getGoalMaterialIcon,
  getActiveGoalCardProgress,
  GOAL_ACCENT_CLASSES,
} from './utils/goalDisplay'
import { getGoalCategoryLabel } from './utils/goalCategories'
import { hasVisibleDescription } from '../../components/DescriptionTooltip'

interface ActiveGoalCardProps {
  /** Goal data to display */
  goal: Goal
  /** Milestones for progress label computation */
  milestones?: GoalMilestone[]
  /** Task trees keyed by milestone id */
  taskTreesByMilestoneId?: Record<string, Task[]>
  /** Live progress from milestones; overrides stale goal.progress when set */
  computedProgressPercent?: number
  /** Card index for accent cycling */
  accentIndex: number
  /** Click handler to navigate to goal detail */
  onClick: () => void
}

/**
 * Active goal card with icon tile, percent badge, description, and horizontal progress bar.
 */
export function ActiveGoalCard({
  goal,
  milestones = [],
  taskTreesByMilestoneId = {},
  computedProgressPercent,
  accentIndex,
  onClick,
}: ActiveGoalCardProps) {
  /* Progress + label from shared helper so bar/badge match the footer text */
  const { percent: displayProgress, label: progressLabel } = getActiveGoalCardProgress(
    milestones,
    taskTreesByMilestoneId,
    computedProgressPercent !== undefined ? computedProgressPercent : goal.progress,
  )
  const progressRounded = Math.round(Math.min(100, Math.max(0, displayProgress)))

  /* Accent + icon styling from shared helpers */
  const accent = getGoalAccent(accentIndex)
  const accentClasses = GOAL_ACCENT_CLASSES[accent]
  const iconName = getGoalMaterialIcon(goal, accentIndex)

  /* Plain-text preview for rich HTML descriptions on list cards */
  const descriptionPreview = goal.description
    ? goal.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    : ''
  const showDescription = hasVisibleDescription(goal.description)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-left transition-all duration-300 hover:shadow-lg md:p-8"
      aria-label={`View goal: ${goal.name}, ${progressRounded}% progress`}
    >
      {/* Top row: icon, optional category, and percent badge */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors ${accentClasses.iconTile} ${accentClasses.iconTileHover}`}
          >
            <MaterialIcon name={iconName} className="text-[24px]" />
          </div>
          {goal.category ? (
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              {getGoalCategoryLabel(goal.category)}
            </span>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${accentClasses.badge}`}
        >
          {progressRounded}% Done
        </span>
      </div>

      {/* Title and description */}
      <h3 className="mb-2 text-body font-semibold text-on-surface">{goal.name}</h3>
      {showDescription ? (
        <p className="mb-8 line-clamp-3 flex-grow text-secondary text-on-surface-variant">
          {descriptionPreview}
        </p>
      ) : (
        <div className="mb-8 flex-grow" />
      )}

      {/* Progress bar footer */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs font-bold uppercase tracking-tight text-outline">
          <span>Progress</span>
          <span>{progressLabel}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={`h-full rounded-full transition-all duration-500 ${accentClasses.bar}`}
            style={{ width: `${progressRounded}%` }}
          />
        </div>
      </div>
    </button>
  )
}
