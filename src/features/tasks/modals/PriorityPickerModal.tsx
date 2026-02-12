/* PriorityPickerModal: Compact popover for selecting task priority (None, Low, Normal, High, Urgent) */

import { useEffect, useRef, useState } from 'react'
import { FlagIcon } from '../../../components/icons'
import type { TaskPriority } from '../types'

export interface PriorityPickerModalProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Function to call when popover should close */
  onClose: () => void
  /** Current priority value */
  value: TaskPriority
  /** Function to call when a priority is selected (can be async) */
  onSelect: (priority: TaskPriority) => void | Promise<void>
  /** Reference to the trigger element (priority flag button) for positioning */
  triggerRef: React.RefObject<HTMLElement | null>
}

const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

/**
 * Priority flag icon component: Renders the priority flag SVG with appropriate colors
 * none = black stroke/white fill, low = grey, medium = blue, high = yellow, urgent = red
 */
function PriorityFlag({ priority, size = 16 }: { priority: TaskPriority; size?: number }) {
  const getFlagClasses = (p: TaskPriority): string => {
    const map: Record<TaskPriority, string> = {
      none: 'stroke-bonsai-slate-800 fill-white',
      low: 'stroke-bonsai-slate-400 fill-bonsai-slate-100 text-bonsai-slate-500',
      medium: 'stroke-blue-500 fill-blue-50 text-blue-600',
      high: 'stroke-yellow-500 fill-yellow-100 text-yellow-600',
      urgent: 'stroke-red-500 fill-red-100 text-red-600',
    }
    return map[p] ?? map.none
  }

  const sizeClass = size === 16 ? 'w-4 h-4' : size === 20 ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <FlagIcon className={`${sizeClass} shrink-0 ${getFlagClasses(priority)}`} aria-hidden />
  )
}

export function PriorityPickerModal({ isOpen, onClose, value, onSelect, triggerRef }: PriorityPickerModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  /* Position calculation: Calculate popover position relative to trigger element with viewport boundary detection */
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return

    const calculatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect()
      const popoverRect = popoverRef.current!.getBoundingClientRect()
      
      /* Initial position: Below the priority flag, aligned to its left edge */
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

  /* Handle priority selection: Call onSelect (await if async) and close popover after save completes */
  const handleSelect = async (priority: TaskPriority) => {
    try {
      await onSelect(priority)
      /* Close popover only after save completes successfully */
      onClose()
    } catch (error) {
      /* Keep popover open on error so user can try again */
      console.error('Error selecting priority:', error)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Popover: Compact dropdown positioned below priority flag */}
      <div
        ref={popoverRef}
        className="fixed z-50 rounded-lg border border-bonsai-slate-200 bg-white shadow-lg"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        role="menu"
      >
        {/* Priority options: Compact vertical list with flag icon and label */}
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
              {/* Priority flag icon: Shows visual representation of priority */}
              <PriorityFlag priority={opt.value} size={16} />
              {/* Priority label: Text label for the priority */}
              <span className="text-xs">{opt.label}</span>
              {/* Checkmark: Show checkmark for selected priority */}
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
