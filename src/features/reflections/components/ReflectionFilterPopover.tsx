/* ReflectionFilterPopover: Type filter popover for Recent Entries */

import { useEffect, useRef, type RefObject } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { REFLECTION_ENTRY_TYPES, getEntryTypeLabel } from '../utils/entryDisplay'

interface ReflectionFilterPopoverProps {
  /** Whether the popover is open */
  open: boolean
  /** Currently selected entry types */
  selectedTypes: string[]
  /** Toggle a type in the filter */
  onToggleType: (type: string) => void
  /** Clear all type filters */
  onClear: () => void
  /** Close the popover */
  onClose: () => void
  /** Anchor element ref for positioning (optional; uses fixed placement below trigger) */
  anchorRef: RefObject<HTMLElement | null>
}

/**
 * Popover for filtering reflection entries by type (Daily Briefing, Journal, Weekly Review).
 */
export function ReflectionFilterPopover({
  open,
  selectedTypes,
  onToggleType,
  onClear,
  onClose,
  anchorRef,
}: ReflectionFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  /* Close on outside click */
  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        popoverRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return
      }
      onClose()
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose, anchorRef])

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest py-2 shadow-lg"
      role="dialog"
      aria-label="Filter reflections by type"
    >
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-secondary font-semibold text-on-surface">Filter by type</span>
        {selectedTypes.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-secondary text-primary hover:opacity-80"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="px-2">
        {REFLECTION_ENTRY_TYPES.map((type) => {
          const checked = selectedTypes.includes(type)
          return (
            <li key={type}>
              <button
                type="button"
                onClick={() => onToggleType(type)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-body text-on-surface transition-colors hover:bg-surface-container"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    checked
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-transparent'
                  }`}
                >
                  {checked && <MaterialIcon name="check" className="text-sm" />}
                </span>
                {getEntryTypeLabel(type)}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
