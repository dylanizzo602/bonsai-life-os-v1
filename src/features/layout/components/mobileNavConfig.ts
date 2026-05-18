/* mobileNavConfig: Material icon names for mobile overlay nav */

import type { NavigationSection } from '../hooks/useNavigation'

/** Material symbol names aligned with TOP_NAV_ITEMS + settings */
export const MOBILE_NAV_MATERIAL_ICONS: Partial<Record<NavigationSection, string>> = {
  home: 'dashboard',
  tasks: 'task_alt',
  habits: 'repeat',
  goals: 'flag',
  reflections: 'auto_stories',
  notes: 'description',
  settings: 'settings',
}
