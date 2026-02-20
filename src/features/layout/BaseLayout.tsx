/* Base layout: responsive shell with navigation sidebar and flexible content area */
import { useState, useRef, useEffect } from 'react'
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
  /* Debug: H2 – ref to measure main content wrapper height on mobile */
  const contentWrapperRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLMainElement>(null)

  /* Debug: H2/H3 – log layout mount and content dimensions after paint */
  useEffect(() => {
    const wrapper = contentWrapperRef.current
    const main = mainRef.current
    const w = wrapper ? { clientHeight: wrapper.clientHeight, clientWidth: wrapper.clientWidth } : null
    const m = main ? { clientHeight: main.clientHeight, clientWidth: main.clientWidth } : null
    fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'BaseLayout.tsx:useEffect',message:'content dimensions',data:{activeSection,contentWrapper:w,main:m},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  }, [activeSection])

  /* Event handlers: Toggle mobile menu */
  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  /* Outer wrapper: flex row, fill root height so main content area has definite height on mobile */
  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      {/* Desktop sidebar: Fixed left navigation for large screens */}
      <SideNav activeSection={activeSection} onNavigate={onNavigate} />

      {/* Main content area: Adjusts for sidebar on desktop; flex-1 so it fills and scrolls on mobile */}
      <div ref={contentWrapperRef} className="flex flex-1 flex-col min-h-0 min-w-0 lg:ml-20">
        {/* Header: Logo and hamburger only on mobile/tablet; hidden on desktop to avoid top line */}
        <header className="shrink-0 border-b border-bonsai-slate-200 bg-white lg:hidden" aria-label="Site header">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <BonsaiLogo iconSize="w-8 h-8" showText={true} textSize="text-lg" />
            <HamburgerMenu onClick={handleToggleMobileMenu} />
          </div>
        </header>

        {/* Main content area: Flex column so child fills and scrolls; wrapper ensures page content is scrollable */}
        <main ref={mainRef} className="flex flex-col min-w-0 flex-1 min-h-0 p-4 md:p-6">
          <div className="flex-1 min-h-0 min-w-0 overflow-auto">
            {children}
          </div>
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
