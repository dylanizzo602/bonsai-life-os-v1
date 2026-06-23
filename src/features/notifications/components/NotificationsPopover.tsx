/* NotificationsPopover: In-app notifications (habits, tasks, briefing) — mobile full-screen, desktop anchored */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { HabitReminderItem } from '../../habits/HabitReminderItem'
import type { useInAppNotifications } from '../hooks/useInAppNotifications'
import { BriefingNotificationItem } from './BriefingNotificationItem'
import { TaskNotificationItem } from './TaskNotificationItem'

const PANEL_MAX_WIDTH = 420
const ANCHOR_GAP_PX = 8
const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

type InAppNotifications = ReturnType<typeof useInAppNotifications>

interface NotificationsPopoverProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  notifications: InAppNotifications
  /** Navigate to Tasks when user taps a task or habit reminder */
  onGoToTasks?: () => void
  /** Navigate to Briefings when user taps the morning briefing row */
  onGoToBriefings?: () => void
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
 * Notifications UI: mixed feed with dismiss actions and habit quick-complete buttons.
 */
export function NotificationsPopover({
  isOpen,
  onClose,
  triggerRef,
  notifications,
  onGoToTasks,
  onGoToBriefings,
}: NotificationsPopoverProps) {
  const isMobile = useIsMobileViewport()
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: PANEL_MAX_WIDTH })

  const {
    visibleNotifications,
    dismissNotification,
    dismissAll,
    runHabitAction,
    actionInFlightIds,
  } = notifications

  /* Refresh tasks/habits/briefing when panel opens */
  useEffect(() => {
    if (isOpen) {
      void notifications.refetch()
    }
  }, [isOpen, notifications.refetch])

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
  }, [isOpen, isMobile, triggerRef, visibleNotifications.length])

  /* ESC to close */
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const panelContent = (
    <NotificationsPanel
      items={visibleNotifications}
      showCloseButton={isMobile}
      onClose={onClose}
      onDismissAll={() => void dismissAll()}
      onDismiss={dismissNotification}
      onTargetComplete={(row) => void runHabitAction(row.rowKey, row, 'completed')}
      onMinimum={(row) => void runHabitAction(row.rowKey, row, 'minimum')}
      onSkip={(row) => void runHabitAction(row.rowKey, row, 'skipped')}
      actionInFlightIds={actionInFlightIds}
      onGoToTasks={onGoToTasks}
      onGoToBriefings={onGoToBriefings}
    />
  )

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
  items: InAppNotifications['visibleNotifications']
  showCloseButton: boolean
  onClose: () => void
  onDismissAll: () => void
  onDismiss: (rowKey: string) => void
  onTargetComplete: (row: Extract<InAppNotifications['visibleNotifications'][number], { kind: 'habit' }>) => void
  onMinimum: (row: Extract<InAppNotifications['visibleNotifications'][number], { kind: 'habit' }>) => void
  onSkip: (row: Extract<InAppNotifications['visibleNotifications'][number], { kind: 'habit' }>) => void
  actionInFlightIds: Set<string>
  onGoToTasks?: () => void
  onGoToBriefings?: () => void
}

/** Shared header + scrollable mixed notification list */
function NotificationsPanel({
  items,
  showCloseButton,
  onClose,
  onDismissAll,
  onDismiss,
  onTargetComplete,
  onMinimum,
  onSkip,
  actionInFlightIds,
  onGoToTasks,
  onGoToBriefings,
}: NotificationsPanelProps) {
  const dismissButtonClass =
    'absolute right-2 top-2 rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2 py-0.5 text-xs font-semibold text-primary shadow-sm hover:bg-primary/10'

  const handleOpenTasks = () => {
    onGoToTasks?.()
    onClose()
  }

  const handleOpenBriefings = () => {
    onGoToBriefings?.()
    onClose()
  }

  return (
    <>
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
            onClick={onDismissAll}
            className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:text-primary-container"
          >
            Dismiss all
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:max-h-[min(600px,70vh)] md:p-5">
        {items.length === 0 ? (
          <p className="py-10 text-center text-secondary text-on-surface-variant">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              if (item.kind === 'morning_briefing') {
                return (
                  <div key={item.rowKey} className="relative">
                    <BriefingNotificationItem onOpen={handleOpenBriefings} />
                    <button
                      type="button"
                      onClick={() => void onDismiss(item.rowKey)}
                      className={dismissButtonClass}
                      aria-label="Dismiss notification"
                    >
                      Dismiss
                    </button>
                  </div>
                )
              }

              if (item.kind === 'task_overdue' || item.kind === 'task_due_soon') {
                return (
                  <div key={item.rowKey} className="relative">
                    <TaskNotificationItem
                      task={item.task}
                      variant={item.kind}
                      onOpen={handleOpenTasks}
                    />
                    <button
                      type="button"
                      onClick={() => void onDismiss(item.rowKey)}
                      className={dismissButtonClass}
                      aria-label="Dismiss notification"
                    >
                      Dismiss
                    </button>
                  </div>
                )
              }

              return (
                <div key={item.rowKey} className="relative">
                  <HabitReminderItem
                    habit={item.habit}
                    task={item.task}
                    remindAt={item.remindAt}
                    reminderTime={item.habit.reminder_time}
                    onTargetComplete={() => onTargetComplete(item)}
                    onMinimum={() => onMinimum(item)}
                    onSkip={() => onSkip(item)}
                    actionsDisabled={actionInFlightIds.has(item.rowKey)}
                    density="compact"
                    showStreakBreakdown={false}
                  />
                  <button
                    type="button"
                    onClick={() => void onDismiss(item.rowKey)}
                    className={dismissButtonClass}
                    aria-label="Dismiss reminder"
                  >
                    Dismiss
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {onGoToTasks ? (
          <button
            type="button"
            onClick={handleOpenTasks}
            className="mt-4 w-full text-center text-secondary font-medium text-primary hover:underline"
          >
            Open Tasks
          </button>
        ) : null}
      </div>
    </>
  )
}
