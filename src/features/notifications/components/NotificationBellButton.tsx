/* NotificationBellButton: Bell with badge and habit-reminder popover */

import { useRef, useState, type ReactNode } from 'react'
import { useInAppNotifications } from '../hooks/useInAppNotifications'
import { NotificationsPopover } from './NotificationsPopover'

interface NotificationBellButtonProps {
  className?: string
  children: ReactNode
  ariaLabel?: string
  onGoToTasks?: () => void
}

/**
 * Notifications bell: shows badge when habit reminders are pending; opens popover.
 */
export function NotificationBellButton({
  className,
  children,
  ariaLabel = 'Notifications',
  onGoToTasks,
}: NotificationBellButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const notifications = useInAppNotifications()
  const { unreadCount } = notifications

  const handleToggle = () => {
    setIsOpen((open) => !open)
  }

  const badgeLabel =
    unreadCount > 0
      ? `${unreadCount} notification${unreadCount === 1 ? '' : 's'}`
      : undefined

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label={badgeLabel ?? ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleToggle}
      >
        {children}
        {unreadCount > 0 ? (
          <span
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error"
            aria-hidden
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <NotificationsPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={buttonRef}
        notifications={notifications}
        onGoToTasks={onGoToTasks}
      />
    </div>
  )
}
