/* GoalDateRangeChip: Start/target date metadata chip with popover for New Goal modal */
import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { formatGoalDateRangeLabel } from '../utils/goalCategories'

interface GoalDateRangeChipProps {
  startDate: string
  targetDate: string
  onStartDateChange: (value: string) => void
  onTargetDateChange: (value: string) => void
}

/**
 * Chip button that opens a popover with start and target date inputs.
 */
export function GoalDateRangeChip({
  startDate,
  targetDate,
  onStartDateChange,
  onTargetDateChange,
}: GoalDateRangeChipProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const invalid = Boolean(startDate && targetDate && startDate > targetDate)

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

  const label = formatGoalDateRangeLabel(startDate || null, targetDate || null)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:bg-surface-container-high ${
          startDate || targetDate
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
        }`}
        aria-expanded={open}
      >
        <MaterialIcon name="calendar_today" className="text-lg" />
        <span>{label}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-xl">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-secondary font-medium text-on-surface-variant">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-secondary font-medium text-on-surface-variant">
                Target date
              </label>
              <input
                type="date"
                value={targetDate}
                min={startDate || undefined}
                onChange={(e) => onTargetDateChange(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {invalid && (
              <p className="text-secondary text-error">Target date must be on or after start date</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
