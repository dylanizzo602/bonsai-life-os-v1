/* Base layout: responsive shell with navigation sidebar and flexible content area */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { SideNav } from './components/SideNav'
import { HamburgerMenu } from './components/HamburgerMenu'
import { MobileSideNav } from './components/MobileSideNav'
import { BonsaiLogo } from '../../components/icons'
import type { NavigationSection } from './hooks/useNavigation'

interface BaseLayoutProps {
  /** Main content to render inside the layout (e.g. route content or placeholder) */
  children: ReactNode
  /** Currently active navigation section */
  activeSection: NavigationSection
  /** Callback when navigation section changes */
  onNavigate: (section: NavigationSection) => void
}

/**
 * Responsive base layout with side navigation
 * Desktop: Fixed sidebar with hover expansion
 * Mobile/Tablet: Hamburger menu with overlay navigation
 */
export function BaseLayout({ children, activeSection, onNavigate }: BaseLayoutProps) {
  /* State management: Track mobile menu open/closed state */
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  /* Event handlers: Toggle mobile menu */
  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen min-w-0">
      {/* Desktop sidebar: Fixed left navigation for large screens */}
      <SideNav activeSection={activeSection} onNavigate={onNavigate} />

      {/* Main content area: Adjusts for sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-20">
        {/* Header: Logo and hamburger only on mobile/tablet; hidden on desktop to avoid top line */}
        <header className="shrink-0 border-b border-bonsai-slate-200 bg-white lg:hidden" aria-label="Site header">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <BonsaiLogo iconSize="w-8 h-8" showText={true} textSize="text-lg" />
            <HamburgerMenu onClick={handleToggleMobileMenu} />
          </div>
        </header>

        {/* Main content area: Flexible content with responsive padding */}
        <main className="min-w-0 flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile side navigation: Overlay menu for tablet/mobile */}
      <MobileSideNav
        isOpen={isMobileMenuOpen}
        activeSection={activeSection}
        onNavigate={onNavigate}
        onClose={handleCloseMobileMenu}
      />
    </div>
  )
}
