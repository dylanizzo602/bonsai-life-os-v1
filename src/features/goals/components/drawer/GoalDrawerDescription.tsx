/* GoalDrawerDescription: editable description section */
import { useGoalFieldAutosave } from '../../hooks/useGoalFieldAutosave'
import type { Goal, UpdateGoalInput } from '../../types'

interface GoalDrawerDescriptionProps {
  goal: Goal
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
}

/**
 * Description section with auto-save textarea.
 */
export function GoalDrawerDescription({ goal, updateGoal }: GoalDrawerDescriptionProps) {
  const description = useGoalFieldAutosave({
    goal,
    field: 'description',
    updateGoal,
    serialize: (v) => {
      const s = typeof v === 'string' ? v.trim() : ''
      return s || null
    },
  })

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
        Description
      </h3>
      <textarea
        value={(description.value as string) || ''}
        onChange={(e) => description.setValue(e.target.value)}
        onBlur={description.onBlur}
        rows={4}
        placeholder="Describe the outcome you want to achieve..."
        className="w-full resize-y rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 text-body leading-relaxed text-on-surface transition-all placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </section>
  )
}
