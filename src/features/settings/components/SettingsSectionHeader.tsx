/* SettingsSectionHeader: Icon + uppercase section title for settings groups */

import { MaterialIcon } from './MaterialIcon'

interface SettingsSectionHeaderProps {
  icon: string
  title: string
}

/**
 * Section heading row used above each settings card group.
 */
export function SettingsSectionHeader({ icon, title }: SettingsSectionHeaderProps) {
  return (
    <div className="mb-6 flex items-center gap-2">
      <MaterialIcon name={icon} className="text-primary" />
      <h2 className="settings-section-label">{title}</h2>
    </div>
  )
}
