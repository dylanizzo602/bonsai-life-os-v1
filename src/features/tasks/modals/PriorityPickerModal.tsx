/* PriorityPickerModal: Compact popover for selecting task priority (None, Urgent, High, Medium, Low) */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { PriorityFlagIcon } from '../components/PriorityFlagIcon'
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

/* Priority options: Order and labels match Zenith priority picker mock */
const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function PriorityPickerModal({ isOpen, onClose, value, onSelect, triggerRef }: PriorityPickerModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      /* Anchor below the priority icon when a trigger is available (all breakpoints). */
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        let top = triggerRect.bottom + 4
        let left = triggerRect.left
        if (left + popoverRect.width > viewportWidth - padding) left = viewportWidth - popoverRect.width - padding
        if (left < padding) left = padding
        if (top + popoverRect.height > viewportHeight - padding) top = triggerRect.top - popoverRect.height - 4
        if (top < padding) top = padding
        setPosition({ top, left })
        return
      }

      /* Fallback: center in viewport when no trigger is available */
      let top = (viewportHeight - popoverRect.height) / 2
      let left = (viewportWidth - popoverRect.width) / 2
      top = Math.max(padding, Math.min(top, viewportHeight - popoverRect.height - padding))
      left = Math.max(padding, Math.min(left, viewportWidth - popoverRect.width - padding))
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

  /* Portal above fullscreen task modal (same stacking as StatusPickerModal / TagModal) */
  const overlay = (
    <div className="fixed inset-0 z-[9999]" aria-hidden onClick={onClose} />
  )

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] w-48 rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Section header: Compact uppercase label */}
      <div className="mb-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-outline">
        Set Priority
      </div>

      {/* Priority options: Filled flag icon, label, and checkmark for selection */}
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void handleSelect(opt.value)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex w-full items-center gap-3 px-4 py-2 text-sm text-on-surface transition-colors ${
              isSelected ? 'bg-primary-container/10' : 'hover:bg-primary-container/10'
            }`}
          >
            <PriorityFlagIcon priority={opt.value} />
            <span className="font-medium">{opt.label}</span>
            {isSelected && (
              <MaterialIcon name="check" className="ml-auto text-xs text-primary" />
            )}
          </button>
        )
      })}
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
