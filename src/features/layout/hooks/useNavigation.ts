/* Navigation hook: Manages active section state and navigation logic */
import { useState, useCallback } from 'react'

export type NavigationSection =
  | 'home'
  | 'tasks'
  | 'habits'
  | 'goals'
  | 'reflections'
  | 'briefings'
  | 'weekly-briefing'
  | 'experiences'
  | 'notes'
  | 'settings'

interface UseNavigationReturn {
  /** Currently active navigation section */
  activeSection: NavigationSection
  /** Function to change the active section */
  setActiveSection: (section: NavigationSection) => void
}

/**
 * Custom hook for managing navigation state
 * Provides active section tracking and navigation functions
 */
export function useNavigation(initialSection: NavigationSection = 'home'): UseNavigationReturn {
  /* State management: Track active navigation section */
  const [activeSection, setActiveSectionState] = useState<NavigationSection>(initialSection)

  /* Navigation handler: Update active section */
  const setActiveSection = useCallback((section: NavigationSection) => {
    setActiveSectionState(section)
  }, [])

  return {
    activeSection,
    setActiveSection,
  }
}
