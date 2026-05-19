/* MaterialIcon: Renders a Google Material Symbols Outlined glyph by name */

import type { CSSProperties } from 'react'

interface MaterialIconProps {
  /** Symbol name (e.g. person, settings) */
  name: string
  className?: string
  style?: CSSProperties
}

/**
 * Material Symbols Outlined icon wrapper for zenith layouts (nav, settings, etc.).
 */
export function MaterialIcon({ name, className = '', style }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={style}
      aria-hidden
    >
      {name}
    </span>
  )
}
