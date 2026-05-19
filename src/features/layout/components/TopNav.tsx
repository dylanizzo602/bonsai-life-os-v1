/* TopNav: Fixed app bar with center nav links (desktop) and utility actions */

import { useState } from 'react'
import type { NavigationSection } from '../hooks/useNavigation'
import { DesktopSearch } from '../../search/components/DesktopSearch'
import {
  BellIcon,
  BonsaiLogo,
  CloseIcon,
  HamburgerIcon,
  SearchIcon,
  SettingsIcon,
} from '../../../components/icons'
import { NotificationBellButton } from '../../notifications/components/NotificationBellButton'
import { TOP_NAV_ITEMS } from './topNavConfig'

interface TopNavProps {
  activeSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  /** Mobile: open overlay side nav */
  onMenuToggle: () => void
  /** When true, menu button shows close (X) and sits above the overlay */
  isMobileMenuOpen?: boolean
  /** Mobile/tablet: open full-screen search */
  onOpenMobileSearch?: () => void
  /** When true, hide top bar on mobile/tablet (search is full-screen) */
  isMobileSearchOpen?: boolean
}

/**
 * Global top navigation for all authenticated screens.
 * Center links hidden below md; hamburger visible below md.
 */
export function TopNav({
  activeSection,
  onNavigate,
  onMenuToggle,
  isMobileMenuOpen = false,
  onOpenMobileSearch,
  isMobileSearchOpen = false,
}: TopNavProps) {
  /* Desktop search expanded: fade center nav to avoid overlap */
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false)

  /* Utility buttons: search placeholder; notifications opens anchored popover */
  const utilityButtonClass =
    'rounded-full p-2 text-primary transition-colors hover:bg-surface-container-low active:scale-[0.98]'

  return (
    <header
      className={`fixed top-0 flex w-full items-center justify-between border-b border-outline-variant/10 bg-surface-container-low px-4 py-4 md:px-6 ${
        isMobileMenuOpen ? 'z-50' : 'z-40'
      } ${isMobileSearchOpen ? 'max-lg:hidden' : ''}`}
      aria-label="Site header"
    >
      {/* Brand: logo + wordmark navigates home */}
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex min-w-0 items-center gap-2 rounded-lg transition-opacity hover:opacity-90"
          aria-label="Bonsai home"
        >
          <BonsaiLogo iconSize="h-8 w-8" showText={false} />
          <span className="font-headline text-2xl font-semibold tracking-tight text-primary">
            Bonsai
          </span>
        </button>
      </div>

      {/* Center nav: desktop/tablet only */}
      <nav
        className={`absolute left-1/2 hidden -translate-x-1/2 gap-8 transition-opacity duration-300 md:flex ${
          isDesktopSearchOpen ? 'lg:pointer-events-none lg:opacity-0' : ''
        }`}
        aria-label="Main navigation"
        aria-hidden={isDesktopSearchOpen}
      >
        {TOP_NAV_ITEMS.map(({ id, label }) => {
          const isActive = activeSection === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`relative font-headline text-sm tracking-wide transition-colors ${
                isActive
                  ? 'font-bold text-primary after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:bg-primary after:content-[""]'
                  : 'rounded px-2 py-1 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* Right: utilities + mobile menu */}
      <div className="flex items-center gap-2 text-primary md:gap-4">
        {/* Desktop: expanding search; mobile/tablet: placeholder until dedicated design */}
        <div className="relative hidden h-10 w-10 shrink-0 lg:block">
          <DesktopSearch onOpenChange={setIsDesktopSearchOpen} />
        </div>
        <button
          type="button"
          className={`${utilityButtonClass} lg:hidden`}
          aria-label="Open search"
          onClick={onOpenMobileSearch}
        >
          <SearchIcon className="h-6 w-6" />
        </button>
        <NotificationBellButton className={utilityButtonClass}>
          <BellIcon className="h-6 w-6" />
        </NotificationBellButton>
        {/* Settings: desktop/tablet only (mobile uses side nav account section) */}
        <button
          type="button"
          className={`${utilityButtonClass} hidden md:inline-flex`}
          aria-label="Account settings"
          onClick={() => onNavigate('settings')}
        >
          <SettingsIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={onMenuToggle}
          className={`${utilityButtonClass} md:hidden`}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <CloseIcon className="h-6 w-6" />
          ) : (
            <HamburgerIcon className="h-6 w-6" />
          )}
        </button>
      </div>
    </header>
  )
}

