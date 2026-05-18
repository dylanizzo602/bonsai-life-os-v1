/* NotificationBellButton: Bell trigger with anchored notifications popover */

import { useRef, useState, type ReactNode } from 'react'
import { NotificationsPopover } from './NotificationsPopover'

interface NotificationBellButtonProps {
  /** Bell button classes */
  className?: string
  /** Icon inside the button */
  children: ReactNode
  ariaLabel?: string
}

/**
 * Notifications bell: full-screen modal on mobile, anchored popover on md+.
 */
export function NotificationBellButton({
  className,
  children,
  ariaLabel = 'Notifications',
}: NotificationBellButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen((open) => !open)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleToggle}
      >
        {children}
      </button>

      <NotificationsPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={buttonRef}
      />
    </div>
  )
}
