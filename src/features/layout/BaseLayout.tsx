/* Base layout: Top navigation shell with scrollable content and mobile overlay nav */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { AppFooter } from '../../components/AppFooter'
import { TopNav } from './components/TopNav'
import { MobileSideNav } from './components/MobileSideNav'
import { MobileSearch } from '../search/components/MobileSearch'
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
 * Responsive base layout with fixed top navigation on all breakpoints.
 * Mobile/tablet: hamburger opens overlay side nav (legacy mobile nav until redesigned).
 */
export function BaseLayout({ children, activeSection, onNavigate }: BaseLayoutProps) {
  /* State management: Track mobile menu and mobile search overlays */
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

  /* Event handlers: Toggle mobile menu */
  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen((open) => !open)
  }

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleOpenMobileSearch = () => {
    setIsMobileMenuOpen(false)
    setIsMobileSearchOpen(true)
  }

  const handleCloseMobileSearch = () => {
    setIsMobileSearchOpen(false)
  }

  /* Shell: fixed top bar; footer at end of scrollable content (not viewport-pinned) */
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TopNav
        activeSection={activeSection}
        onNavigate={onNavigate}
        onMenuToggle={handleToggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
        onOpenMobileSearch={handleOpenMobileSearch}
        isMobileSearchOpen={isMobileSearchOpen}
      />

      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col pt-20 ${isMobileSearchOpen ? 'max-lg:invisible' : ''}`}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
          <AppFooter onNavigateToFeedback={() => onNavigate('feedback')} />
        </div>
      </main>

      <MobileSideNav
        isOpen={isMobileMenuOpen}
        activeSection={activeSection}
        onNavigate={onNavigate}
        onClose={handleCloseMobileMenu}
      />

      <MobileSearch isOpen={isMobileSearchOpen} onClose={handleCloseMobileSearch} />
    </div>
  )
}
