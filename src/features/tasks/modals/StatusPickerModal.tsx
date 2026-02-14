/* StatusPickerModal: Compact popover for selecting task status (OPEN, IN PROGRESS, COMPLETE) */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

  /* Position calculation: Center on mobile/tablet (< 1024px); anchor to trigger on desktop */
  const DESKTOP_BREAKPOINT = 1024

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      /* Mobile/tablet: center popover in viewport */
      if (viewportWidth < DESKTOP_BREAKPOINT) {
        let top = (viewportHeight - popoverRect.height) / 2
        let left = (viewportWidth - popoverRect.width) / 2
        top = Math.max(padding, Math.min(top, viewportHeight - popoverRect.height - padding))
        left = Math.max(padding, Math.min(left, viewportWidth - popoverRect.width - padding))
        setPosition({ top, left })
        return
      }

      /* Desktop: position below trigger with viewport boundary detection */
      if (!triggerRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      let top = triggerRect.bottom + 4
      let left = triggerRect.left
      if (left + popoverRect.width > viewportWidth - padding) left = viewportWidth - popoverRect.width - padding
      if (left < padding) left = padding
      if (top + popoverRect.height > viewportHeight - padding) top = triggerRect.top - popoverRect.height - 4
      if (top < padding) top = padding
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

  /* Handle status selection: Call onSelect (await if async) and close popover after save completes */
  const handleSelect = async (status: DisplayStatus) => {
    try {
      await onSelect(status)
      onClose()
    } catch (error) {
      console.error('Error selecting status:', error)
    }
  }

  if (!isOpen) return null

  /* Full-screen overlay (below popover) blocks all clicks from reaching the page;
   * clicking the overlay closes the modal so the task row never receives a click. */
  const overlay = (
    <div
      className="fixed inset-0 z-[9999]"
      aria-hidden
      onClick={onClose}
    />
  )

  /* Popover above overlay; only overlay or popover receive clicks when open. */
  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-lg border border-bonsai-slate-200 bg-white shadow-lg"
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
            onClick={(e) => {
              e.stopPropagation()
              void handleSelect(opt.value)
            }}
            onMouseDown={(e) => e.stopPropagation()}
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
  )

  return createPortal(
    <>
      {overlay}
      {popover}
    </>,
    document.body,
  )
}
