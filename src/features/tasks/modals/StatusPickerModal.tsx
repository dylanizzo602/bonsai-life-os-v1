/* StatusPickerModal: Compact popover for selecting task status (OPEN, IN PROGRESS, COMPLETE) */

import { useEffect, useRef, useState } from 'react'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

export interface StatusPickerModalProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Function to call when popover should close */
  onClose: () => void
  /** Current display status value */
  value: DisplayStatus
  /** Function to call when a status is selected (can be async) */
  onSelect: (status: DisplayStatus) => void | Promise<void>
  /** Reference to the trigger element (status circle button) for positioning */
  triggerRef: React.RefObject<HTMLElement | null>
}

const OPTIONS: { value: DisplayStatus; label: string }[] = [
  { value: 'open', label: 'OPEN' },
  { value: 'in_progress', label: 'IN PROGRESS' },
  { value: 'complete', label: 'COMPLETE' },
]

/**
 * Status circle icon component: Renders the status circle SVG for a given status
 * OPEN = black dotted stroke no fill, IN PROGRESS = dotted yellow + fill, COMPLETE = solid green + fill
 */
function StatusCircle({ status, size = 20 }: { status: DisplayStatus; size?: number }) {
  const r = (size - 4) / 2
  const cx = size / 2
  const cy = size / 2

  if (status === 'complete') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-green-500, #22c55e)"
          stroke="var(--color-green-600, #16a34a)"
          strokeWidth={2}
        />
      </svg>
    )
  }

  if (status === 'in_progress') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-yellow-400, #facc15)"
          stroke="var(--color-yellow-500, #eab308)"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      </svg>
    )
  }

  /* OPEN: black dotted stroke, no fill */
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="2 2"
        className="text-bonsai-slate-800"
      />
    </svg>
  )
}

export function StatusPickerModal({ isOpen, onClose, value, onSelect, triggerRef }: StatusPickerModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  /* Position calculation: Calculate popover position relative to trigger element with viewport boundary detection */
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return

    const calculatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect()
      const popoverRect = popoverRef.current!.getBoundingClientRect()
      
      /* Initial position: Below the status circle, aligned to its left edge */
      let top = triggerRect.bottom + 4 // 4px gap below trigger
      let left = triggerRect.left // Align with left edge of trigger
      
      /* Boundary adjustment: Keep popover within viewport */
      const padding = 8 // Minimum padding from viewport edges
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      /* Horizontal boundary: Adjust left if popover would overflow right edge */
      if (left + popoverRect.width > viewportWidth - padding) {
        /* Shift left to keep popover within viewport */
        left = viewportWidth - popoverRect.width - padding
      }
      
      /* Ensure popover doesn't go off left edge */
      if (left < padding) {
        left = padding
      }
      
      /* Vertical boundary: Adjust top if popover would overflow bottom edge */
      if (top + popoverRect.height > viewportHeight - padding) {
        /* Position above trigger instead of below */
        top = triggerRect.top - popoverRect.height - 4
      }
      
      /* Ensure popover doesn't go off top edge */
      if (top < padding) {
        top = padding
      }
      
      setPosition({ top, left })
    }

    /* Calculate position after a brief delay to ensure DOM is ready */
    const timeoutId = setTimeout(calculatePosition, 0)
    
    /* Recalculate on scroll/resize */
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, triggerRef])

  /* Close popover when clicking outside */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  /* Handle status selection: Call onSelect (await if async) and close popover after save completes */
  const handleSelect = async (status: DisplayStatus) => {
    try {
      await onSelect(status)
      /* Close popover only after save completes successfully */
      onClose()
    } catch (error) {
      /* Keep popover open on error so user can try again */
      console.error('Error selecting status:', error)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Popover: Compact dropdown positioned below status circle */}
      <div
        ref={popoverRef}
        className="fixed z-50 rounded-lg border border-bonsai-slate-200 bg-white shadow-lg"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        role="menu"
      >
        {/* Status options: Compact vertical list with icon and label */}
        <div className="flex flex-col p-1.5 min-w-[180px]">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                value === opt.value
                  ? 'bg-bonsai-sage-50 text-bonsai-slate-800'
                  : 'bg-white text-bonsai-slate-800 hover:bg-bonsai-slate-50'
              }`}
            >
              {/* Status circle icon: Shows visual representation of status */}
              <StatusCircle status={opt.value} size={16} />
              {/* Status label: Text label for the status */}
              <span className="uppercase text-xs">{opt.label}</span>
              {/* Checkmark: Show checkmark for selected status */}
              {value === opt.value && (
                <svg
                  className="ml-auto w-4 h-4 text-bonsai-slate-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
