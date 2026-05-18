/* TopNav: Fixed app bar with center nav links (desktop) and utility actions */

import type { NavigationSection } from '../hooks/useNavigation'
import { BellIcon, BonsaiLogo, HamburgerIcon, SearchIcon, SettingsIcon } from '../../../components/icons'
import { TOP_NAV_ITEMS } from './topNavConfig'

interface TopNavProps {
  activeSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  /** Mobile: open overlay side nav */
  onMenuToggle: () => void
}

/**
 * Global top navigation for all authenticated screens.
 * Center links hidden below md; hamburger visible below md.
 */
export function TopNav({ activeSection, onNavigate, onMenuToggle }: TopNavProps) {
  /* Utility buttons: search and notifications are visual-only for now */
  const utilityButtonClass =
    'rounded-full p-2 text-primary transition-colors hover:bg-surface-container-low active:scale-[0.98]'

  return (
    <header
      className="fixed top-0 z-40 flex w-full items-center justify-between border-b border-outline-variant bg-surface px-4 py-4 md:px-6"
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
        className="absolute left-1/2 hidden -translate-x-1/2 gap-8 md:flex"
        aria-label="Main navigation"
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
        <button type="button" className={utilityButtonClass} aria-label="Search" title="Coming soon">
          <SearchIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          className={utilityButtonClass}
          aria-label="Notifications"
          title="Coming soon"
        >
          <BellIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          className={utilityButtonClass}
          aria-label="Account settings"
          onClick={() => onNavigate('settings')}
        >
          <SettingsIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={onMenuToggle}
          className={`${utilityButtonClass} md:hidden`}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon className="h-6 w-6" />
        </button>
      </div>
    </header>
  )
}

