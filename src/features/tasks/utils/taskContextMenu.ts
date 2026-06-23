/* taskContextMenu: Helpers for task right-click context menu (thumbnail, status label, last edited) */

import type { Task, TaskAttachment } from '../types'

const DESKTOP_BREAKPOINT_PX = 1024

/** Viewport is desktop (lg) — task right-click context menu */
export function isDesktopContextMenuViewport(): boolean {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= DESKTOP_BREAKPOINT_PX
}

/** Open task context menu only on desktop right-click; always suppress native menu on desktop */
export function handleDesktopTaskContextMenu(
  event: {
    preventDefault: () => void
    stopPropagation: () => void
    clientX: number
    clientY: number
  },
  openAt: (position: { x: number; y: number }) => void,
): void {
  if (!isDesktopContextMenuViewport()) return
  event.preventDefault()
  /* Stop bubbling so parent containers (e.g. edit task modal) do not open their own menu */
  event.stopPropagation()
  openAt({ x: event.clientX, y: event.clientY })
}

/** Lineup action label for context menu / task options */
export function getLineupMenuLabel(inLineUp: boolean): string {
  return inLineUp ? 'Remove from Lineup' : 'Add to Lineup'
}

/** Trash/delete action label for context menu */
export function getTaskDeleteMenuLabel(isDeleted: boolean): string {
  return isDeleted ? 'Restore' : 'Delete'
}

/** First image attachment URL for menu header preview */
export function getTaskContextThumbnail(task: Task): string | null {
  const attachments = Array.isArray(task.attachments) ? task.attachments : []
  const image = attachments.find(
    (a: TaskAttachment) =>
      (a.type?.startsWith('image/') ?? false) ||
      /\.(jpe?g|png|gif|webp|svg)$/i.test(a.url),
  )
  return image?.url ?? null
}

/** Uppercase status label in menu header */
export function getTaskContextStatusLabel(task: Task): string {
  switch (task.status) {
    case 'in_progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    case 'archived':
      return 'Archived'
    case 'deleted':
      return 'Deleted'
    default:
      return 'Active Task'
  }
}

/** True when the task is in Today's Lineup (manual pick or auto rules, not excluded). */
export function isTaskInLineupMenu(
  taskId: string,
  lineUpTaskIds?: Set<string>,
  displayedLineupTaskIds?: Set<string>,
): boolean {
  return (lineUpTaskIds?.has(taskId) ?? false) || (displayedLineupTaskIds?.has(taskId) ?? false)
}

/** Footer metadata: "Last edited 2h ago" */
export function formatTaskLastEdited(updatedAt: string): string {
  const updated = new Date(updatedAt).getTime()
  const diffMs = Date.now() - updated
  if (Number.isNaN(updated) || diffMs < 0) return 'Last edited recently'

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Last edited just now'
  if (minutes < 60) return `Last edited ${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Last edited ${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `Last edited ${days}d ago`

  return `Last edited ${new Date(updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`
}
