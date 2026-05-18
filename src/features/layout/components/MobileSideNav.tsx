/* MobileSideNav: Zenith full-screen overlay navigation for tablet/mobile */

import { useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { BonsaiLogo } from '../../../components/icons'
import type { NavigationSection } from '../hooks/useNavigation'
import { setQuickAddIntent } from '../quickAddIntent'
import { TOP_NAV_ITEMS } from './topNavConfig'
import { MOBILE_NAV_MATERIAL_ICONS } from './mobileNavConfig'
import { MobileQuickAdd } from './MobileQuickAdd'
import { MobileNavAccountSection } from './MobileNavAccountSection'
import { NotificationBellButton } from '../../notifications/components/NotificationBellButton'

interface MobileSideNavProps {
  isOpen: boolean
  activeSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  onClose: () => void
}

const headerIconClass =
  'rounded-full p-2 text-secondary transition-colors hover:bg-surface-container-low hover:text-primary'

/**
 * Full-screen mobile navigation: header utilities, main links, Quick Add, account section at bottom.
 */
export function MobileSideNav({ isOpen, activeSection, onNavigate, onClose }: MobileSideNavProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleNavClick = (section: NavigationSection) => {
    onNavigate(section)
    onClose()
  }

  const handleQuickAddTask = () => {
    setQuickAddIntent('task')
    handleNavClick('tasks')
  }

  const handleQuickAddNote = () => {
    setQuickAddIntent('note')
    handleNavClick('notes')
  }

  const handleQuickAddInbox = () => {
    setQuickAddIntent('inbox')
    handleNavClick('home')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-on-surface/25"
        onClick={onClose}
        aria-label="Close navigation menu"
      />

      <aside
        className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface"
        aria-label="Mobile navigation menu"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: brand + search, notifications, close */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-outline-variant/10 bg-surface-container-low px-5 py-2.5">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex min-w-0 items-center gap-2 rounded-lg transition-opacity hover:opacity-90"
            aria-label="Bonsai home"
          >
            <BonsaiLogo iconSize="h-8 w-8" showText={false} />
            <span className="font-headline truncate text-xl font-bold tracking-tight text-primary">
              Bonsai
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className={headerIconClass}
              aria-label="Search"
              title="Coming soon"
              disabled
            >
              <MaterialIcon name="search" className="text-[22px]" />
            </button>
            <NotificationBellButton className={headerIconClass}>
              <MaterialIcon name="notifications" className="text-[22px]" />
            </NotificationBellButton>
            <button
              type="button"
              onClick={onClose}
              className={headerIconClass}
              aria-label="Close navigation menu"
            >
              <MaterialIcon name="close" className="text-[22px]" />
            </button>
          </div>
        </div>

        {/* Body: main links, Quick Add (after Notes), Settings pinned to bottom */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-3 pb-4">
          <nav className="shrink-0" aria-label="Main navigation">
            <ul className="flex flex-col">
              {TOP_NAV_ITEMS.map(({ id, label }) => {
                const isActive = activeSection === id
                const symbol = MOBILE_NAV_MATERIAL_ICONS[id]

                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-l-[3px] border-primary bg-primary/10 font-semibold text-primary'
                          : 'border-l-[3px] border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {symbol ? (
                        <MaterialIcon
                          name={symbol}
                          className={`text-[20px] ${isActive ? 'text-primary' : 'text-outline'}`}
                        />
                      ) : null}
                      <span className="text-body font-medium">{label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Quick Add: directly below main nav (after Notes) */}
          <div className="mt-3 shrink-0">
            <MobileQuickAdd
              onAddTask={handleQuickAddTask}
              onAddNote={handleQuickAddNote}
              onAddInbox={handleQuickAddInbox}
            />
          </div>

          {/* Account: profile row + Settings / Log out */}
          <div className="mt-auto shrink-0">
            <MobileNavAccountSection
              onOpenSettings={() => handleNavClick('settings')}
              onClose={onClose}
            />
          </div>
        </div>
      </aside>
    </div>
  )
}
