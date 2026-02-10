/* Bonsai logo: Tree with checkmark and hexagonal foliage */

interface BonsaiLogoProps {
  /** Size class for the icon */
  iconSize?: string
  /** Show text label next to icon */
  showText?: boolean
  /** Text size class */
  textSize?: string
}

/**
 * Bonsai logo component with optional text label
 * Displays the Bonsai tree logo with "Bonsai" and "LifeOS" text
 */
export function BonsaiLogo({ iconSize = 'w-8 h-8', showText = false, textSize = 'text-lg' }: BonsaiLogoProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Logo image: Bonsai tree with checkmark base and hexagonal foliage */}
      <img
        src="/bonsai-logo.png"
        alt="Bonsai Logo"
        className={`${iconSize} object-contain`}
      />
      {/* Text labels: Show when expanded */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-bonsai-brown-700 ${textSize}`}>Bonsai</span>
          <span className="text-sm text-bonsai-slate-500">LifeOS</span>
        </div>
      )}
    </div>
  )
}
