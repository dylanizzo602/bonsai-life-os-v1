/* TaskContextPopover: Right-click context menu for a task (Rename, Duplicate, Archive, Delete) */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Task } from '../types'

export interface TaskContextPopoverProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Called when popover should close */
  onClose: () => void
  /** Position: clientX from context menu event */
  x: number
  /** Position: clientY from context menu event */
  y: number
  /** Task this menu applies to */
  task: Task
  /** Open edit modal (Rename) */
  onRename: (task: Task) => void
  /** Duplicate the task */
  onDuplicate: (task: Task) => void
  /** Archive the task (optional; sets status to archived) */
  onArchive?: (task: Task) => void
  /** Mark task as deleted (soft delete; sets status to deleted) */
  onMarkDeleted?: (task: Task) => void
  /** Permanently delete the task from the database */
  onDelete: (task: Task) => void
}

const PADDING = 8
const MIN_WIDTH = 160

/**
 * Context menu popover for a task: Rename, Duplicate, Archive, Delete.
 * Positioned at (x, y) with viewport boundary detection; styled to match design (light background, rounded, spaced).
 */
export function TaskContextPopover({
  isOpen,
  onClose,
  x,
  y,
  task,
  onRename,
  onDuplicate,
  onArchive,
  onMarkDeleted,
  onDelete,
}: TaskContextPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  /* Position: center on mobile/tablet (< 1024px); at (x,y) with clamp on desktop */
  const DESKTOP_BREAKPOINT = 1024

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return
    const el = popoverRef.current
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left: number
    let top: number
    if (vw < DESKTOP_BREAKPOINT) {
      left = Math.max(PADDING, (vw - rect.width) / 2)
      top = Math.max(PADDING, (vh - rect.height) / 2)
    } else {
      left = x
      top = y
      if (left + rect.width > vw - PADDING) left = vw - rect.width - PADDING
      if (left < PADDING) left = PADDING
      if (top + rect.height > vh - PADDING) top = vh - rect.height - PADDING
      if (top < PADDING) top = PADDING
    }
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
    onRename(task)
    onClose()
  }
  const handleDuplicate = () => {
    onDuplicate(task)
    onClose()
  }
  const handleArchive = () => {
    onArchive?.(task)
    onClose()
  }
  const handleMarkDeleted = () => {
    onMarkDeleted?.(task)
    onClose()
  }
  const handleDelete = () => {
    onDelete(task)
    onClose()
  }

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-xl border border-bonsai-slate-200 bg-bonsai-brown-50 py-2 shadow-lg"
      style={{ left: x, top: y, minWidth: MIN_WIDTH }}
      role="menu"
      aria-label="Task options"
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
        <button
          type="button"
          role="menuitem"
          onClick={handleArchive}
          className="text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100 text-left px-4 py-2.5 transition-colors"
        >
          Archive
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
