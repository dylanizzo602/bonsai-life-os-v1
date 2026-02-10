/* Mobile side navigation: Overlay menu for tablet/mobile screens */
import { useEffect } from 'react'
import { BonsaiLogo, CloseIcon } from '../../../components/icons'
import {
  HomeIcon,
  TasksIcon,
  HabitsIcon,
  GoalsIcon,
  ReflectionsIcon,
  BriefingsIcon,
  SettingsIcon,
} from '../../../components/icons'
import type { NavigationSection } from '../hooks/useNavigation'

interface MobileSideNavProps {
  /** Whether the mobile menu is open */
  isOpen: boolean
  /** Currently active navigation section */
  activeSection: NavigationSection
  /** Callback when a navigation item is clicked */
  onNavigate: (section: NavigationSection) => void
  /** Callback to close the mobile menu */
  onClose: () => void
}

/* Navigation item configuration: Icons and labels for each section */
const navItems: Array<{
  id: NavigationSection
  icon: React.ComponentType<{ className?: string }>
  label: string
}> = [
  { id: 'home', icon: HomeIcon, label: 'Home' },
  { id: 'briefings', icon: BriefingsIcon, label: 'Briefing' },
  { id: 'goals', icon: GoalsIcon, label: 'Goals' },
  { id: 'tasks', icon: TasksIcon, label: 'Tasks' },
  { id: 'habits', icon: HabitsIcon, label: 'Habits' },
  { id: 'reflections', icon: ReflectionsIcon, label: 'Reflections' },
]

/**
 * Mobile side navigation component
 * Displays as an overlay menu on tablet/mobile screens when hamburger menu is clicked
 */
export function MobileSideNav({ isOpen, activeSection, onNavigate, onClose }: MobileSideNavProps) {
  /* Effect: Prevent body scroll when menu is open */
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

  /* Effect: Close menu on escape key press */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  /* Event handlers: Handle navigation item clicks */
  const handleNavClick = (section: NavigationSection) => {
    onNavigate(section)
    onClose() // Close menu after navigation
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop: Invisible so content behind stays visible; still closes menu on tap */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side navigation panel: Wide enough for full labels; no horizontal scroll */}
      <aside
        className="fixed left-0 top-0 h-full w-72 min-w-[260px] max-w-[90vw] bg-white shadow-xl z-50 lg:hidden flex flex-col"
        aria-label="Mobile navigation menu"
      >
        {/* Header: Logo and close button */}
        <div className="flex items-center justify-between h-14 sm:h-16 border-b border-bonsai-slate-200 px-3 sm:px-4 flex-shrink-0">
          <BonsaiLogo iconSize="w-7 h-7 sm:w-8 sm:h-8" showText={true} textSize="text-base sm:text-lg" />
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close navigation menu"
          >
            <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Main navigation items: Icons at fixed size, labels never truncated */}
        <nav
          className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden min-w-0"
          aria-label="Navigation menu"
        >
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left min-w-0 ${
                      isActive
                        ? 'bg-bonsai-sage-50 text-bonsai-sage-600'
                        : 'text-bonsai-slate-500 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-700'
                    }`}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${isActive ? 'text-bonsai-sage-600' : 'text-bonsai-slate-500'}`} />
                    </span>
                    <span
                      className={`font-medium flex-shrink-0 whitespace-nowrap ${isActive ? 'text-bonsai-sage-600' : 'text-bonsai-slate-700'}`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom section: Settings link */}
        <div className="border-t border-bonsai-slate-200 py-4 px-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left min-w-0 ${
              activeSection === 'settings'
                ? 'bg-bonsai-sage-50 text-bonsai-sage-600'
                : 'text-bonsai-slate-500 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-700'
            }`}
            aria-label="Settings"
            aria-current={activeSection === 'settings' ? 'page' : undefined}
          >
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              <SettingsIcon
                className={`w-6 h-6 ${activeSection === 'settings' ? 'text-bonsai-sage-600' : 'text-bonsai-slate-500'}`}
              />
            </span>
            <span
              className={`font-medium flex-shrink-0 whitespace-nowrap ${activeSection === 'settings' ? 'text-bonsai-sage-600' : 'text-bonsai-slate-700'}`}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
