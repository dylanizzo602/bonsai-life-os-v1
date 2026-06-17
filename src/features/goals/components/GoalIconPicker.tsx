/* GoalIconPicker: Material icon tile with popover grid for New Goal modal */
import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DEFAULT_GOAL_ICON, GOAL_ICON_OPTIONS } from '../utils/goalCategories'

interface GoalIconPickerProps {
  value: string
  onChange: (iconName: string) => void
  /** Compact tile for drawer header (matches progress bar row height) */
  size?: 'md' | 'sm'
}

/**
 * Icon tile button that opens a popover grid of selectable Material icons.
 */
export function GoalIconPicker({ value, onChange, size = 'md' }: GoalIconPickerProps) {
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

  const displayIcon = value || DEFAULT_GOAL_ICON
  const isSm = size === 'sm'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high text-on-surface-variant transition-all hover:bg-surface-variant active:scale-95 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 ${
          isSm ? 'h-8 w-8' : 'h-14 w-14 rounded-xl'
        }`}
        aria-label="Choose goal icon"
        aria-expanded={open}
      >
        <MaterialIcon name={displayIcon} className={isSm ? 'text-[18px]' : 'text-[30px]'} />
      </button>

      {open && (
        <div
          className={`absolute top-full z-20 mt-2 grid w-56 grid-cols-4 gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 shadow-xl ${
            isSm ? 'right-0' : 'left-0'
          }`}
        >
          {GOAL_ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                onChange(icon)
                setOpen(false)
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high ${
                displayIcon === icon ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'text-on-surface-variant'
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
