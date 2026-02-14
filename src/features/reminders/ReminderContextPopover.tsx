/* ReminderContextPopover: Right-click context menu for a reminder (Rename, Duplicate, Delete) */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Reminder } from './types'

export interface ReminderContextPopoverProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Called when popover should close */
  onClose: () => void
  /** Position: clientX from context menu event */
  x: number
  /** Position: clientY from context menu event */
  y: number
  /** Reminder this menu applies to */
  reminder: Reminder
  /** Open edit modal (Rename) */
  onRename: (reminder: Reminder) => void
  /** Duplicate the reminder */
  onDuplicate: (reminder: Reminder) => void
  /** Mark reminder as deleted (soft delete; hidden until "Show deleted" is on) */
  onMarkDeleted?: (reminder: Reminder) => void
  /** Permanently delete the reminder from the database */
  onDelete: (reminder: Reminder) => void
}

const PADDING = 8
const MIN_WIDTH = 160

/**
 * Context menu popover for a reminder: Rename, Duplicate, Delete.
 * Positioned at (x, y) with viewport boundary detection; styled to match task context menu.
 */
export function ReminderContextPopover({
  isOpen,
  onClose,
  x,
  y,
  reminder,
  onRename,
  onDuplicate,
  onMarkDeleted,
  onDelete,
}: ReminderContextPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  /* Position and clamp to viewport: Adjust so popover stays on screen */
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return
    const el = popoverRef.current
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = x
    let top = y
    if (left + rect.width > vw - PADDING) left = vw - rect.width - PADDING
    if (left < PADDING) left = PADDING
    if (top + rect.height > vh - PADDING) top = vh - rect.height - PADDING
    if (top < PADDING) top = PADDING
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [isOpen, x, y])

  /* Close on click outside or Escape */
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const t = setTimeout(() => {
      document.addEventListener('click', handleClick, true)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  /* Menu actions: Run handler and close */
  const handleRename = () => {
    onRename(reminder)
    onClose()
  }
  const handleDuplicate = () => {
    onDuplicate(reminder)
    onClose()
  }
  const handleMarkDeleted = () => {
    onMarkDeleted?.(reminder)
    onClose()
  }
  const handleDelete = () => {
    onDelete(reminder)
    onClose()
  }

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] rounded-xl border border-bonsai-slate-200 bg-bonsai-brown-50 shadow-lg py-2"
      style={{ left: x, top: y, minWidth: MIN_WIDTH }}
      role="menu"
      aria-label="Reminder options"
    >
      <div className="flex flex-col">
        <button
          type="button"
          role="menuitem"
          onClick={handleRename}
          className="text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100 text-left px-4 py-2.5 transition-colors rounded-none first:rounded-t-xl"
        >
          Rename
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={handleDuplicate}
          className="text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100 text-left px-4 py-2.5 transition-colors"
        >
          Duplicate
        </button>
        {onMarkDeleted && (
          <button
            type="button"
            role="menuitem"
            onClick={handleMarkDeleted}
            className="text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100 text-left px-4 py-2.5 transition-colors"
          >
            Mark deleted
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={handleDelete}
          className="text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100 text-left px-4 py-2.5 transition-colors rounded-none last:rounded-b-xl"
        >
          Permanently delete
        </button>
      </div>
    </div>
  )

  return createPortal(popover, document.body)
}
