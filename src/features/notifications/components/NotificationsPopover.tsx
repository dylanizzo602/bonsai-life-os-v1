/* NotificationsPopover: Full-screen on mobile; anchored below bell on md+ */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import {
  PLACEHOLDER_NOTIFICATIONS,
  type PlaceholderNotification,
} from '../placeholderNotifications'

const PANEL_MAX_WIDTH = 420
const ANCHOR_GAP_PX = 8
const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

interface NotificationsPopoverProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}

/** Match Tailwind `md` breakpoint: mobile = viewport below 768px */
function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA_QUERY).matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handleChange = () => setIsMobile(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

/**
 * Notifications UI: full-screen modal on mobile, anchored popover on tablet/desktop.
 */
export function NotificationsPopover({ isOpen, onClose, triggerRef }: NotificationsPopoverProps) {
  const isMobile = useIsMobileViewport()
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: PANEL_MAX_WIDTH })
  const [items, setItems] = useState<PlaceholderNotification[]>(PLACEHOLDER_NOTIFICATIONS)

  /* Reset placeholders when opened */
  useEffect(() => {
    if (isOpen) {
      setItems(PLACEHOLDER_NOTIFICATIONS)
    }
  }, [isOpen])

  /* Mobile: lock page scroll while full-screen panel is open */
  useEffect(() => {
    if (!isOpen || !isMobile) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, isMobile])

  /* Desktop/tablet: position panel below trigger, right-aligned to bell */
  useLayoutEffect(() => {
    if (!isOpen || isMobile) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const panelWidth = Math.min(PANEL_MAX_WIDTH, viewportWidth - padding * 2)
      const triggerRect = trigger.getBoundingClientRect()
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 400

      let top = triggerRect.bottom + ANCHOR_GAP_PX
      let left = triggerRect.right - panelWidth

      if (left < padding) left = padding
      if (left + panelWidth > viewportWidth - padding) {
        left = viewportWidth - panelWidth - padding
      }

      if (top + panelHeight > viewportHeight - padding) {
        top = triggerRect.top - panelHeight - ANCHOR_GAP_PX
      }
      if (top < padding) top = padding

      setPosition({ top, left, width: panelWidth })
    }

    updatePosition()
    const timeoutId = window.setTimeout(updatePosition, 0)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, isMobile, triggerRef, items.length])

  /* ESC to close */
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [])

  const handleClear = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  if (!isOpen) return null

  const panelContent = (
    <NotificationsPanel
      items={items}
      showCloseButton={isMobile}
      onClose={onClose}
      onMarkAllRead={handleMarkAllRead}
      onClear={handleClear}
    />
  )

  /* Mobile: full-screen modal */
  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex flex-col bg-surface-container-lowest" role="presentation">
        <div className="absolute inset-0 bg-on-surface/25" aria-hidden onClick={onClose} />
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby="notifications-popover-title"
          aria-modal="true"
          className="relative z-10 flex min-h-0 flex-1 flex-col bg-surface-container-lowest"
          onClick={(e) => e.stopPropagation()}
        >
          {panelContent}
        </div>
      </div>,
      document.body,
    )
  }

  /* Desktop/tablet: anchored popover below bell */
  return createPortal(
    <>
      <div className="fixed inset-0 z-[55]" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="notifications-popover-title"
        aria-modal="true"
        className="fixed z-[56] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_32px_64px_-12px_rgba(81,96,81,0.16)]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {panelContent}
      </div>
    </>,
    document.body,
  )
}

interface NotificationsPanelProps {
  items: PlaceholderNotification[]
  showCloseButton: boolean
  onClose: () => void
  onMarkAllRead: () => void
  onClear: (id: string) => void
}

/** Shared header + scrollable notification list */
function NotificationsPanel({
  items,
  showCloseButton,
  onClose,
  onMarkAllRead,
  onClear,
}: NotificationsPanelProps) {
  return (
    <>
      {/* Header: close (mobile), title, mark all read */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/20 px-5 py-4 md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-2">
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              aria-label="Close notifications"
            >
              <MaterialIcon name="close" className="text-[22px]" />
            </button>
          ) : null}
          <h2 id="notifications-popover-title" className="text-body font-semibold text-on-surface">
            Notifications
          </h2>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:text-primary-container"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      {/* Notification list */}
      <div className="min-h-0 flex-1 overflow-y-auto md:max-h-[min(600px,70vh)]">
        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-secondary text-on-surface-variant">
            You&apos;re all caught up.
          </p>
        ) : (
          items.map((item, index) => (
            <NotificationRow
              key={item.id}
              item={item}
              isLast={index === items.length - 1}
              onClear={() => onClear(item.id)}
            />
          ))
        )}
      </div>
    </>
  )
}

interface NotificationRowProps {
  item: PlaceholderNotification
  isLast: boolean
  onClear: () => void
}

/** Single notification row: icon, text, and right column (time + clear aligned to body) */
function NotificationRow({ item, isLast, onClear }: NotificationRowProps) {
  const borderClass = isLast ? '' : 'border-b border-outline-variant/10'

  return (
    <div
      className={`flex gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low sm:px-6 ${borderClass}`}
    >
      {/* Category icon */}
      <div className="shrink-0 self-start">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconContainerClass}`}
        >
          <MaterialIcon name={item.icon} className={`text-[20px] ${item.iconClass}`} />
        </div>
      </div>

      {/* Text + actions: time on title row; clear vertically centered with body */}
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        <h3
          className={`text-secondary text-on-surface ${item.read ? 'font-medium' : 'font-bold'}`}
        >
          {item.title}
        </h3>
        <span className="whitespace-nowrap text-xs text-outline">{item.timeAgo}</span>
        <p
          className={`text-secondary leading-relaxed ${
            item.read ? 'text-outline' : 'text-on-surface-variant'
          }`}
        >
          {item.body}
        </p>
        <div className="flex items-center justify-end self-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            className="rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
