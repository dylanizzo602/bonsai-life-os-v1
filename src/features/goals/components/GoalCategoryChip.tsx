/* GoalCategoryChip: Life-area category picker chip for New Goal modal */
import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { GoalCategory } from '../types'
import { getGoalCategoryLabel, GOAL_CATEGORY_OPTIONS } from '../utils/goalCategories'

interface GoalCategoryChipProps {
  value: GoalCategory | null
  onChange: (category: GoalCategory | null) => void
}

/**
 * Chip button that opens a popover list of goal categories.
 */
export function GoalCategoryChip({ value, onChange }: GoalCategoryChipProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const label = getGoalCategoryLabel(value)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:bg-surface-container-high ${
          value
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
        }`}
        aria-expanded={open}
      >
        <MaterialIcon name="category" className="text-lg" />
        <span>{label}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-xl">
          {GOAL_CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full px-4 py-2.5 text-left text-body transition-colors hover:bg-surface-container-low ${
                value === opt.value ? 'font-semibold text-primary' : 'text-on-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
