/* GoalDrawerHeader: sticky title + progress bar */
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { useGoalFieldAutosave } from '../../hooks/useGoalFieldAutosave'
import type { Goal, UpdateGoalInput } from '../../types'

interface GoalDrawerHeaderProps {
  goal: Goal
  progressPercent: number
  onClose: () => void
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
}

/**
 * Drawer header with editable title, close button, and overall progress bar.
 */
export function GoalDrawerHeader({
  goal,
  progressPercent,
  onClose,
  updateGoal,
}: GoalDrawerHeaderProps) {
  const title = useGoalFieldAutosave({
    goal,
    field: 'name',
    updateGoal,
    serialize: (v) => (typeof v === 'string' ? v.trim() : v),
    validate: (v) => typeof v === 'string' && v.trim().length > 0,
  })

  const rounded = Math.round(Math.min(100, Math.max(0, progressPercent)))

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-surface-container-high bg-surface-container-lowest/80 px-8 py-6 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <input
          type="text"
          value={title.value as string}
          onChange={(e) => title.setValue(e.target.value)}
          onBlur={title.onBlur}
          className="min-w-0 flex-1 border-0 bg-transparent text-page-title font-bold text-on-surface focus:outline-none focus:ring-0"
          placeholder="Goal title"
          aria-label="Goal title"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-2 transition-colors hover:bg-surface-container"
          aria-label="Close goal drawer"
        >
          <MaterialIcon name="close" className="text-on-surface-variant" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-on-surface-variant">Overall Progress</span>
          <span className="text-primary">{rounded}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${rounded}%` }}
          />
        </div>
      </div>
    </div>
  )
}
