/* GoalDrawerDescription: rich text description with auto-save on blur */
import { useEffect, useState } from 'react'
import { hasVisibleDescription } from '../../../../components/DescriptionTooltip'
import { RichTextEditor } from '../../../notes/RichTextEditor'
import type { Goal, UpdateGoalInput } from '../../types'

interface GoalDrawerDescriptionProps {
  goal: Goal
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
}

/**
 * Description section with TipTap rich text editor (same pattern as task modal).
 */
export function GoalDrawerDescription({ goal, updateGoal }: GoalDrawerDescriptionProps) {
  const [description, setDescription] = useState(goal.description ?? '')

  /* Sync when goal changes (e.g. after refetch) */
  useEffect(() => {
    setDescription(goal.description ?? '')
  }, [goal.id, goal.description])

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
        Description
      </h3>
      <div className="w-full rounded-xl border border-outline-variant/30 bg-surface-variant/10 px-4 py-3 text-on-surface outline-none transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <RichTextEditor
          editorKey={goal.id}
          value={description}
          placeholder="Describe the outcome you want to achieve..."
          minHeightClassName="min-h-[120px]"
          onBlur={async (html) => {
            setDescription(html)
            try {
              await updateGoal(goal.id, {
                description: hasVisibleDescription(html) ? html : null,
              })
            } catch (err) {
              console.error('Failed to save goal description:', err)
            }
          }}
        />
      </div>
    </section>
  )
}
