/* GoalMilestoneDraftList: Inline milestone title rows for New Goal modal */
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'

export interface GoalMilestoneDraftListHandle {
  focusFirst: () => void
}

interface GoalMilestoneDraftListProps {
  titles: string[]
  onChange: (titles: string[]) => void
}

/**
 * Draft milestone rows (boolean type on submit); supports add more and focus first row.
 */
export const GoalMilestoneDraftList = forwardRef<
  GoalMilestoneDraftListHandle,
  GoalMilestoneDraftListProps
>(function GoalMilestoneDraftList({ titles, onChange }, ref) {
  const firstInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      firstInputRef.current?.focus()
      firstInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }))

  const updateTitle = (index: number, value: string) => {
    const next = [...titles]
    next[index] = value
    onChange(next)
  }

  const addRow = () => onChange([...titles, ''])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
          <MaterialIcon name="auto_graph" className="text-sm" />
          Add Milestones
        </label>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-bold text-primary hover:underline"
        >
          Add More
        </button>
      </div>

      <div className="space-y-2">
        {titles.map((title, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary/30">
              <div className="h-2 w-2 rounded-full bg-primary/30" />
            </div>
            <input
              ref={index === 0 ? firstInputRef : undefined}
              type="text"
              value={title}
              onChange={(e) => updateTitle(index, e.target.value)}
              placeholder="First Milestone (e.g. Complete 50% of curriculum)"
              className="w-full border-0 border-b border-outline-variant/30 bg-transparent py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-0"
            />
          </div>
        ))}
      </div>
    </section>
  )
})
