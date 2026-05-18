/* topNavConfig: Shared top navigation link definitions */

import type { NavigationSection } from '../hooks/useNavigation'

/** Primary nav links shown in the top bar (tablet/desktop) */
export const TOP_NAV_ITEMS: Array<{ id: NavigationSection; label: string }> = [
  { id: 'home', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'habits', label: 'Habits' },
  { id: 'goals', label: 'Goals' },
  { id: 'reflections', label: 'Reflect' },
  { id: 'notes', label: 'Notes' },
]
