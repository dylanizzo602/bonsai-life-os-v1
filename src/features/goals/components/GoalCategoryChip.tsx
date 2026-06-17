/* GoalCategoryChip: Life-area category picker chip for New Goal modal */
import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { GoalCategory } from '../types'
import { getGoalCategoryLabel, GOAL_CATEGORY_OPTIONS } from '../utils/goalCategories'

interface GoalCategoryChipProps {
  value: GoalCategory | null
  onChange: (category: GoalCategory | null) => void
  /** Compact chip for drawer header (matches progress bar row height) */
  size?: 'md' | 'sm'
}

/**
 * Chip button that opens a popover list of goal categories.
 */
export function GoalCategoryChip({ value, onChange, size = 'md' }: GoalCategoryChipProps) {
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
  const isSm = size === 'sm'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border font-medium transition-all hover:bg-surface-container-high ${
          isSm ? 'h-8 px-2.5 text-xs' : 'gap-2 px-4 py-2 text-sm'
        } ${
          value
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
        }`}
        aria-expanded={open}
      >
        <MaterialIcon name="category" className={isSm ? 'text-base' : 'text-lg'} />
        <span className="max-w-[5.5rem] truncate">{label}</span>
      </button>

      {open && (
        <div
          className={`absolute top-full z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-xl ${
            isSm ? 'right-0' : 'left-0'
          }`}
        >
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
