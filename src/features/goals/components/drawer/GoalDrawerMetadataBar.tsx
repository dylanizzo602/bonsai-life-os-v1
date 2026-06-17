/* GoalDrawerMetadataBar: editable start/target dates */
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { useGoalFieldAutosave } from '../../hooks/useGoalFieldAutosave'
import type { Goal, UpdateGoalInput } from '../../types'

interface GoalDrawerMetadataBarProps {
  goal: Goal
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
}

/**
 * Metadata card with start and target date inputs.
 */
export function GoalDrawerMetadataBar({ goal, updateGoal }: GoalDrawerMetadataBarProps) {
  const startDate = useGoalFieldAutosave({
    goal,
    field: 'start_date',
    updateGoal,
    serialize: (v) => (v === '' ? null : v),
    validate: (v, g) => {
      const start = (v === '' ? null : v) as string | null
      const target = g.target_date
      if (start && target && start > target) return false
      return true
    },
  })

  const targetDate = useGoalFieldAutosave({
    goal,
    field: 'target_date',
    updateGoal,
    serialize: (v) => (v === '' ? null : v),
    validate: (v, g) => {
      const target = (v === '' ? null : v) as string | null
      const start = g.start_date
      if (start && target && start > target) return false
      return true
    },
  })

  return (
    <div className="flex gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="flex flex-1 flex-col gap-2 border-r border-outline-variant/30 pr-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Start Date
        </span>
        <div className="flex items-center gap-2">
          <MaterialIcon name="calendar_today" className="text-[18px] text-on-surface-variant" />
          <input
            type="date"
            value={(startDate.value as string) || ''}
            onChange={(e) => {
              const v = e.target.value
              startDate.setValue(v)
              if (!v || !goal.target_date || v <= goal.target_date) {
                void updateGoal(goal.id, { start_date: v || null })
              }
            }}
            onBlur={startDate.onBlur}
            className="min-w-0 flex-1 border-0 bg-transparent text-body font-medium text-on-surface focus:outline-none focus:ring-0"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Target Date
        </span>
        <div className="flex items-center gap-2">
          <MaterialIcon name="event" className="text-[18px] text-on-surface-variant" />
          <input
            type="date"
            value={(targetDate.value as string) || ''}
            min={(startDate.value as string) || undefined}
            onChange={(e) => {
              const v = e.target.value
              targetDate.setValue(v)
              const start = (startDate.value as string) || goal.start_date
              if (!v || !start || start <= v) {
                void updateGoal(goal.id, { target_date: v || null })
              }
            }}
            onBlur={targetDate.onBlur}
            className="min-w-0 flex-1 border-0 bg-transparent text-body font-medium text-on-surface focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  )
}
