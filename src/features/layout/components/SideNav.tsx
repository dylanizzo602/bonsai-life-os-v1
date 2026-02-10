/* Side navigation: Desktop sidebar with collapsed/expanded states */
import { useState } from 'react'
import { BonsaiLogo, ChevronRightIcon, ChevronLeftIcon } from '../../../components/icons'
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

interface SideNavProps {
  /** Currently active navigation section */
  activeSection: NavigationSection
  /** Callback when a navigation item is clicked */
  onNavigate: (section: NavigationSection) => void
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
  { id: 'tasks', icon: TasksIcon, label: 'To Dos' },
  { id: 'habits', icon: HabitsIcon, label: 'Habits' },
  { id: 'reflections', icon: ReflectionsIcon, label: 'Reflections' },
]

/**
 * Side navigation component for desktop
 * Shows collapsed icon-only view by default, expands on hover to show text labels
 */
export function SideNav({ activeSection, onNavigate }: SideNavProps) {
  /* State management: Track hover state for expansion */
  const [isHovered, setIsHovered] = useState(false)
  /* State management: Track manual expanded state */
  const [isExpanded, setIsExpanded] = useState(false)

  /* Computed state: Determine if sidebar should show expanded view */
  const showExpanded = isHovered || isExpanded

  /* Event handlers: Handle hover state changes */
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  /* Event handlers: Toggle manual expansion */
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  /* Event handlers: Handle navigation item clicks */
  const handleNavClick = (section: NavigationSection) => {
    onNavigate(section)
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-bonsai-slate-200 shadow-sm overflow-visible flex-shrink-0 hidden lg:flex flex-col ${
        showExpanded ? 'w-64 min-w-64 shadow-lg' : 'w-20 min-w-[5rem]'
      }`}
      style={{ transition: 'width 0.2s ease-out, min-width 0.2s ease-out' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Main navigation"
    >
      {/* Logo section: Left-aligned when expanded so text is visible */}
      <div
        className={`flex items-center h-16 border-b border-bonsai-slate-200 flex-shrink-0 ${
          showExpanded ? 'justify-start pl-4 pr-3' : 'justify-center px-2'
        }`}
      >
        <BonsaiLogo iconSize="w-8 h-8" showText={showExpanded} textSize="text-lg" />
      </div>

      {/* Main navigation items: Icons with optional text labels; no scale on hover */}
      <nav className="flex-1 py-4 overflow-visible min-w-0" aria-label="Navigation menu">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-w-0 transform-none ${
                    isActive
                      ? 'bg-bonsai-sage-50 text-bonsai-sage-600'
                      : 'text-bonsai-slate-500 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-700'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Icon: Fixed size, no scale */}
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-bonsai-sage-600' : 'text-bonsai-slate-500'}`} />
                  </span>
                  {/* Text label: Only when expanded; nowrap so full label is visible */}
                  {showExpanded && (
                    <span
                      className={`font-medium whitespace-nowrap ${isActive ? 'text-bonsai-sage-600' : 'text-bonsai-slate-700'}`}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom section: Separator, expand/collapse toggle, and settings */}
      <div className="border-t border-bonsai-slate-200 py-4 px-2 space-y-2 flex-shrink-0">
        {/* Expand/collapse toggle: Manual control for expanded state */}
        <button
          type="button"
          onClick={handleToggleExpand}
          className="w-full flex items-center justify-center p-2 text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100 rounded-lg transition-colors transform-none"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {showExpanded ? (
            <ChevronLeftIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
        </button>

        {/* Settings link: Always at bottom; icon fixed size, no scale */}
        <button
          type="button"
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-w-0 transform-none ${
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
          {showExpanded && (
            <span
              className={`font-medium whitespace-nowrap ${activeSection === 'settings' ? 'text-bonsai-sage-600' : 'text-bonsai-slate-700'}`}
            >
              Settings
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
