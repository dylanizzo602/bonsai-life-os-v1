/* MobileSideNav: Bonsai full-screen overlay navigation for tablet/mobile */

import { useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { NavigationSection } from '../hooks/useNavigation'
import { setQuickAddIntent } from '../quickAddIntent'
import { TOP_NAV_ITEMS, PREVIEW_NAV_ITEMS } from './topNavConfig'
import { useDevMode } from '../../settings/hooks/useDevMode'
import { MOBILE_NAV_MATERIAL_ICONS } from './mobileNavConfig'
import { MobileQuickAdd } from './MobileQuickAdd'
import { MobileNavAccountSection } from './MobileNavAccountSection'

interface MobileSideNavProps {
  isOpen: boolean
  activeSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  onClose: () => void
}

/**
 * Mobile navigation panel below the shared TopNav bar (TopNav stays visible with close X).
 */
export function MobileSideNav({ isOpen, activeSection, onNavigate, onClose }: MobileSideNavProps) {
  const { devModeEnabled } = useDevMode()

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
    <div className="fixed inset-x-0 top-20 bottom-0 z-40 lg:hidden" role="presentation">
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
        {/* Body: nav + Quick Add evenly spaced at natural height; scroll if needed */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-3 pb-4">
          <div
            className="flex min-h-0 flex-1 flex-col justify-evenly gap-3 overflow-y-auto overscroll-contain"
            aria-label="Navigation and quick add"
          >
            <nav className="shrink-0" aria-label="Main navigation">
              <ul className="flex flex-col gap-1">
                {TOP_NAV_ITEMS.map(({ id, label }) => {
                  const isActive = activeSection === id
                  const symbol = MOBILE_NAV_MATERIAL_ICONS[id]

                  return (
                    <li key={id} className="shrink-0">
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
                            className={`shrink-0 text-[20px] ${isActive ? 'text-primary' : 'text-outline'}`}
                          />
                        ) : null}
                        <span className="text-body font-medium">{label}</span>
                      </button>
                    </li>
                  )
                })}
                {devModeEnabled
                  ? PREVIEW_NAV_ITEMS.map(({ id, label }) => {
                      const isActive = activeSection === id
                      const symbol = MOBILE_NAV_MATERIAL_ICONS[id]

                      return (
                        <li key={id} className="shrink-0">
                          <button
                            type="button"
                            onClick={() => handleNavClick(id)}
                            className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                              isActive
                                ? 'border-l-[3px] border-tertiary bg-tertiary/10 font-semibold text-tertiary'
                                : 'border-l-[3px] border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {symbol ? (
                              <MaterialIcon
                                name={symbol}
                                className={`shrink-0 text-[20px] ${isActive ? 'text-tertiary' : 'text-outline'}`}
                              />
                            ) : null}
                            <span className="text-body font-medium">{label}</span>
                          </button>
                        </li>
                      )
                    })
                  : null}
              </ul>
            </nav>

            <div className="shrink-0">
              <MobileQuickAdd
                onAddTask={handleQuickAddTask}
                onAddNote={handleQuickAddNote}
                onAddInbox={handleQuickAddInbox}
              />
            </div>
          </div>

          {/* Account: profile row + Settings / Log out */}
          <div className="shrink-0 pt-4">
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
