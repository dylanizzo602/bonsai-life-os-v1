/* GoalDrawerHeader: sticky title with progress bar, icon, and category */
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { GoalIconPicker } from '../GoalIconPicker'
import { GoalCategoryChip } from '../GoalCategoryChip'
import { useGoalFieldAutosave } from '../../hooks/useGoalFieldAutosave'
import type { Goal, GoalCategory, UpdateGoalInput } from '../../types'

interface GoalDrawerHeaderProps {
  goal: Goal
  progressPercent: number
  onClose: () => void
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
}

/**
 * Drawer header with editable title, progress bar row with compact icon/category controls.
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

  const iconName = useGoalFieldAutosave({
    goal,
    field: 'icon_name',
    updateGoal,
  })

  /* Icon picker: persist immediately on selection */
  const handleIconChange = async (name: string) => {
    iconName.setValue(name)
    await updateGoal(goal.id, { icon_name: name })
  }

  /* Category chip: persist on selection */
  const handleCategoryChange = async (category: GoalCategory | null) => {
    await updateGoal(goal.id, { category })
  }

  const rounded = Math.round(Math.min(100, Math.max(0, progressPercent)))

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-surface-container-high bg-surface-container-lowest/80 px-8 py-6 backdrop-blur-md">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <input
          type="text"
          value={title.value as string}
          onChange={(e) => title.setValue(e.target.value)}
          onBlur={title.onBlur}
          className="min-w-0 flex-1 border-0 border-b-2 border-outline-variant/30 bg-transparent px-0 pb-2 text-page-title font-bold text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-0"
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

      {/* Progress label */}
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-on-surface-variant">Overall Progress</span>
        <span className="text-primary">{rounded}%</span>
      </div>

      {/* Progress bar row: bar on the left, icon + category on the right */}
      <div className="flex items-center gap-3">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${rounded}%` }}
          />
        </div>
        <GoalIconPicker
          size="sm"
          value={(iconName.value as string) || goal.icon_name}
          onChange={handleIconChange}
        />
        <GoalCategoryChip
          size="sm"
          value={goal.category}
          onChange={handleCategoryChange}
        />
      </div>
    </div>
  )
}
