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
  /** Raw aggregate fallback when milestones are absent; ActiveGoalCard derives display % via getActiveGoalCardProgress */
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
      {/* Top row: compact icon + title/category aligned with percent badge */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${accentClasses.iconTile} ${accentClasses.iconTileHover}`}
          >
            <MaterialIcon name={iconName} className="text-[18px]" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-on-surface md:text-base">
              {goal.name}
            </h3>
            {goal.category ? (
              <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-outline md:text-xs">
                {getGoalCategoryLabel(goal.category)}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider md:px-3 md:py-1 md:text-xs ${accentClasses.badge}`}
        >
          {progressRounded}% Done
        </span>
      </div>

      {/* Description */}
      {showDescription ? (
        <p className="mb-6 line-clamp-3 flex-grow text-secondary text-on-surface-variant md:mb-8">
          {descriptionPreview}
        </p>
      ) : (
        <div className="mb-6 flex-grow md:mb-8" />
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
