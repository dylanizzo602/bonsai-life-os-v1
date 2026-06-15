/* MaterialIcon: Renders a Google Material Symbols Outlined glyph by name */

import type { CSSProperties } from 'react'

interface MaterialIconProps {
  /** Symbol name (e.g. person, settings) */
  name: string
  className?: string
  style?: CSSProperties
  /** When true, renders the filled glyph (FILL 1) */
  filled?: boolean
}

/**
 * Material Symbols Outlined icon wrapper for Bonsai layouts (nav, settings, etc.).
 */
export function MaterialIcon({ name, className = '', style, filled = false }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'material-symbols-filled' : ''} ${className}`.trim()}
      style={style}
      aria-hidden
    >
      {name}
    </span>
  )
}
