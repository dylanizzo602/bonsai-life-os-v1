/* MaterialIcon: Renders a Google Material Symbols Outlined glyph by name */

interface MaterialIconProps {
  /** Symbol name (e.g. person, settings) */
  name: string
  className?: string
}

/**
 * Material Symbols Outlined icon wrapper for settings and zenith layouts.
 */
export function MaterialIcon({ name, className = '' }: MaterialIconProps) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()} aria-hidden>
      {name}
    </span>
  )
}
