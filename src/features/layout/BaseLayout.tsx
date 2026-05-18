/* Base layout: Top navigation shell with scrollable content and mobile overlay nav */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { TopNav } from './components/TopNav'
import { MobileSideNav } from './components/MobileSideNav'
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
  /* State management: Track mobile menu open/closed state */
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  /* Event handlers: Toggle mobile menu */
  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen((open) => !open)
  }

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  /* Shell: column layout with fixed top bar and padded scrollable main */
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TopNav
        activeSection={activeSection}
        onNavigate={onNavigate}
        onMenuToggle={handleToggleMobileMenu}
      />

      {/* Main content: offset below fixed header (h-20 ≈ header height) */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col pt-20">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </main>

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
