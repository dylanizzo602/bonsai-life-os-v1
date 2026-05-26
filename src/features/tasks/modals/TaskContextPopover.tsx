/* TaskContextPopover: Desktop right-click / mobile edit-modal task actions (Zenith menu design) */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { Task } from '../types'
import {
  formatTaskLastEdited,
  getTaskContextStatusLabel,
  getTaskContextThumbnail,
  getTaskDeleteMenuLabel,
  isDesktopContextMenuViewport,
  getLineupMenuLabel,
  isTaskInLineupMenu,
} from '../utils/taskContextMenu'

export interface TaskContextPopoverProps {
  isOpen: boolean
  onClose: () => void
  x: number
  y: number
  task: Task
  onOpenTask: (task: Task) => void
  onDuplicate: (task: Task) => void
  onArchive?: (task: Task) => void
  onMarkDeleted?: (task: Task) => void
  onUnlinkFromParent?: (task: Task) => void
  lineUpTaskIds?: Set<string>
  displayedLineupTaskIds?: Set<string>
  /** When set, overrides lineup membership (e.g. task opened from Today's Lineup section) */
  isInTodaysLineup?: boolean
  onAddToLineUp?: (taskId: string) => void
  onRemoveFromLineUp?: (taskId: string) => void
  allowMobile?: boolean
  hideOpenTask?: boolean
}

const PADDING = 8
const MENU_WIDTH_PX = 288 /* w-72 */

type MenuActionTone = 'open' | 'lineup' | 'neutral' | 'danger' | 'restore'

interface ContextMenuActionProps {
  icon: string
  label: string
  onClick: () => void
  tone: MenuActionTone
}

/** Menu row: icon tile + label (matches Zenith context menu mock) */
function ContextMenuAction({ icon, label, onClick, tone }: ContextMenuActionProps) {
  const toneClasses: Record<
    MenuActionTone,
    { row: string; tile: string; icon: string; label: string }
  > = {
    open: {
      row: 'text-on-surface hover:bg-surface-container-high',
      tile: 'bg-primary-fixed text-primary',
      icon: 'text-primary',
      label: 'font-medium',
    },
    lineup: {
      row: 'text-on-surface hover:bg-surface-container-high',
      tile: 'bg-surface-container text-primary',
      icon: 'text-primary',
      label: 'font-normal',
    },
    neutral: {
      row: 'text-on-surface hover:bg-surface-container-high',
      tile: 'bg-surface-container text-on-surface-variant',
      icon: 'text-on-surface-variant',
      label: 'font-normal',
    },
    danger: {
      row: 'text-error hover:bg-error-container/30',
      tile: 'bg-error-container text-error',
      icon: 'text-error',
      label: 'font-medium',
    },
    restore: {
      row: 'text-on-surface hover:bg-surface-container-high',
      tile: 'bg-surface-container text-primary',
      icon: 'text-primary',
      label: 'font-medium',
    },
  }
  const styles = toneClasses[tone]

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${styles.row}`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${styles.tile}`}
      >
        <MaterialIcon name={icon} className={`text-[20px] leading-none ${styles.icon}`} />
      </div>
      <span className={`flex-1 truncate text-base leading-normal ${styles.label}`}>{label}</span>
    </button>
  )
}

/**
 * Task context menu at cursor (desktop) or below ⋯ (mobile edit modal).
 */
export function TaskContextPopover({
  isOpen,
  onClose,
  x,
  y,
  task,
  onOpenTask,
  onDuplicate,
  onMarkDeleted,
  lineUpTaskIds,
  displayedLineupTaskIds,
  isInTodaysLineup,
  onAddToLineUp,
  onRemoveFromLineUp,
  allowMobile = false,
  hideOpenTask = false,
}: TaskContextPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(isDesktopContextMenuViewport)

  useEffect(() => {
    const update = () => setIsDesktop(isDesktopContextMenuViewport())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const canRender = isOpen && (isDesktop || allowMobile)

  useEffect(() => {
    if (!canRender || !popoverRef.current) return
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
  }, [canRender, x, y])

  useEffect(() => {
    if (!canRender) return
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
  }, [canRender, onClose])

  if (!canRender) return null

  const handleOpenTask = () => {
    onOpenTask(task)
    onClose()
  }
  const handleDuplicate = () => {
    onDuplicate(task)
    onClose()
  }
  const isDeleted = task.status === 'deleted'
  const deleteLabel = getTaskDeleteMenuLabel(isDeleted)
  const handleMarkDeleted = () => {
    onMarkDeleted?.(task)
    onClose()
  }
  const inLineUp =
    isInTodaysLineup ??
    isTaskInLineupMenu(task.id, lineUpTaskIds, displayedLineupTaskIds)
  const handleLineUpToggle = () => {
    if (inLineUp) {
      onRemoveFromLineUp?.(task.id)
    } else {
      onAddToLineUp?.(task.id)
    }
    onClose()
  }

  const thumbnailUrl = getTaskContextThumbnail(task)
  const statusLabel = getTaskContextStatusLabel(task)
  const lastEdited = formatTaskLastEdited(task.updated_at)
  const showLineUp =
    onAddToLineUp != null && onRemoveFromLineUp != null && !task.parent_id

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] w-72 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest custom-shadow transition-all duration-200"
      style={{ left: x, top: y, width: MENU_WIDTH_PX }}
      role="menu"
      aria-label="Task options"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-container-low p-4">
        <div className="size-8 shrink-0 overflow-hidden rounded-lg border border-outline-variant">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary-fixed">
              <MaterialIcon name="eco" className="text-[20px] text-primary" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="mb-1 text-[12px] font-bold uppercase leading-none tracking-wider text-on-surface-variant">
            {statusLabel}
          </span>
          <span className="truncate text-sm font-medium text-on-surface">{task.title}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="py-2">
        {!hideOpenTask ? (
          <ContextMenuAction
            icon="open_in_new"
            label="Open Task"
            tone="open"
            onClick={handleOpenTask}
          />
        ) : null}
        {showLineUp ? (
          <ContextMenuAction
            icon="star"
            label={getLineupMenuLabel(inLineUp)}
            tone="lineup"
            onClick={handleLineUpToggle}
          />
        ) : null}
        <ContextMenuAction
          icon="content_copy"
          label="Duplicate"
          tone="neutral"
          onClick={handleDuplicate}
        />
        {onMarkDeleted ? (
          <>
            <div className="mx-4 my-2 h-px bg-outline-variant/30" aria-hidden />
            <ContextMenuAction
              icon={isDeleted ? 'restore_from_trash' : 'delete'}
              label={deleteLabel}
              tone={isDeleted ? 'restore' : 'danger'}
              onClick={handleMarkDeleted}
            />
          </>
        ) : null}
      </div>

      {/* Footer metadata */}
      <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-4 py-3">
        <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          {lastEdited}
        </span>
      </div>
    </div>
  )

  return createPortal(popover, document.body)
}
