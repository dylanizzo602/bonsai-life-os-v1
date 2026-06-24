/* TopNav: Fixed app bar with center nav links (desktop) and utility actions */

import { useMemo, useState } from 'react'
import type { NavigationSection } from '../hooks/useNavigation'
import { useCompactTopNav } from '../hooks/useCompactTopNav'
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
import { TOP_NAV_ITEMS, PREVIEW_NAV_ITEMS } from './topNavConfig'
import { useDevMode } from '../../settings/hooks/useDevMode'

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

interface TopNavLinksProps {
  activeSection: NavigationSection
  devModeEnabled: boolean
  onNavigate: (section: NavigationSection) => void
}

/** Shared center nav link buttons (visible nav + invisible measurement clone) */
function TopNavLinks({ activeSection, devModeEnabled, onNavigate }: TopNavLinksProps) {
  return (
    <>
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
      {devModeEnabled
        ? PREVIEW_NAV_ITEMS.map(({ id, label }) => {
            const isActive = activeSection === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`relative font-headline text-sm tracking-wide transition-colors ${
                  isActive
                    ? 'font-bold text-tertiary after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:bg-tertiary after:content-[""]'
                    : 'rounded px-2 py-1 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {label}
              </button>
            )
          })
        : null}
    </>
  )
}

/**
 * Global top navigation for all authenticated screens.
 * Center links hide when they would clip the logo or utility icons; hamburger takes over.
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
  const { devModeEnabled } = useDevMode()

  /* Layout fit: switch to mobile header when center nav would clip utilities */
  const navItemCount = TOP_NAV_ITEMS.length + (devModeEnabled ? PREVIEW_NAV_ITEMS.length : 0)
  const { headerRef, brandRef, navMeasureRef, utilitiesRef, isCompact } =
    useCompactTopNav(navItemCount)

  /* Utility buttons: search placeholder; notifications opens anchored popover */
  const utilityButtonClass =
    'rounded-full p-2 text-primary transition-colors hover:bg-surface-container-low active:scale-[0.98]'

  /* Center nav visibility: hidden when compact or below md breakpoint */
  const showCenterNav = !isCompact
  const centerNavClassName = useMemo(
    () =>
      `absolute left-1/2 -translate-x-1/2 gap-8 transition-opacity duration-300 ${
        showCenterNav ? 'hidden md:flex' : 'hidden'
      } ${isDesktopSearchOpen ? 'lg:pointer-events-none lg:opacity-0' : ''}`,
    [showCenterNav, isDesktopSearchOpen],
  )

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 flex w-full items-center justify-between border-b border-outline-variant/10 bg-surface-container-low px-4 py-4 md:px-6 ${
        isMobileMenuOpen ? 'z-50' : 'z-40'
      } ${isMobileSearchOpen ? 'max-lg:hidden' : ''}`}
      aria-label="Site header"
    >
      {/* Brand: logo + wordmark navigates home */}
      <div ref={brandRef} className="flex min-w-0 items-center gap-4">
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

      {/* Measurement clone: invisible nav used to detect clipping before showing center links */}
      <nav
        ref={navMeasureRef}
        className="pointer-events-none invisible absolute left-1/2 flex -translate-x-1/2 gap-8"
        aria-hidden
      >
        <TopNavLinks
          activeSection={activeSection}
          devModeEnabled={devModeEnabled}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Center nav: shown only when there is enough room between brand and utilities */}
      <nav
        className={centerNavClassName}
        aria-label="Main navigation"
        aria-hidden={isDesktopSearchOpen || !showCenterNav}
      >
        <TopNavLinks
          activeSection={activeSection}
          devModeEnabled={devModeEnabled}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Right: utilities + mobile menu when compact */}
      <div ref={utilitiesRef} className="flex items-center gap-2 text-primary md:gap-4">
        {/* Desktop search: hidden in compact layout (use mobile search icon instead) */}
        <div
          className={`relative hidden h-10 w-10 shrink-0 ${
            isCompact ? 'lg:hidden' : 'lg:block'
          }`}
        >
          <DesktopSearch onOpenChange={setIsDesktopSearchOpen} onNavigate={onNavigate} />
        </div>
        <button
          type="button"
          className={`${utilityButtonClass} ${isCompact ? 'inline-flex' : 'lg:hidden'}`}
          aria-label="Open search"
          onClick={onOpenMobileSearch}
        >
          <SearchIcon className="h-6 w-6" />
        </button>
        <NotificationBellButton
          className={utilityButtonClass}
          onGoToTasks={() => onNavigate('tasks')}
          onGoToBriefings={() => onNavigate('briefings')}
        >
          <BellIcon className="h-6 w-6" />
        </NotificationBellButton>
        {/* Settings: hidden in compact layout (mobile side nav account section) */}
        <button
          type="button"
          className={`${utilityButtonClass} ${isCompact ? 'hidden' : 'hidden md:inline-flex'}`}
          aria-label="Account settings"
          onClick={() => onNavigate('settings')}
        >
          <SettingsIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={onMenuToggle}
          className={`${utilityButtonClass} ${isCompact ? 'inline-flex' : 'md:hidden'}`}
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
