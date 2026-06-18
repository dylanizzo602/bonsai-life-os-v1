/* HabitIconPicker: Material icon tile with popover grid for habit modal */

import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DEFAULT_HABIT_ICON, HABIT_ICON_OPTIONS } from '../utils/habitDisplay'

interface HabitIconPickerProps {
  value: string
  onChange: (iconName: string) => void
}

/**
 * Icon tile button that opens a popover grid of selectable Material icons.
 */
export function HabitIconPicker({ value, onChange }: HabitIconPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  /* Close popover when clicking outside */
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

  const displayIcon = value || DEFAULT_HABIT_ICON

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-primary transition-colors hover:border-primary"
        aria-label="Choose habit icon"
        aria-expanded={open}
      >
        <MaterialIcon name={displayIcon} className="text-[30px]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 grid w-56 grid-cols-4 gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 shadow-xl">
          {HABIT_ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                onChange(icon)
                setOpen(false)
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high ${
                displayIcon === icon
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'text-on-surface-variant'
              }`}
              aria-label={`Icon ${icon}`}
            >
              <MaterialIcon name={icon} className="text-[22px]" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
