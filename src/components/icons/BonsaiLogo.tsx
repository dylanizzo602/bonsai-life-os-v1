/* Bonsai logo: Official B monogram mark with optional wordmark */

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
 * Uses the official Bonsai Productivity monogram from `/bonsai-logo.png`.
 */
export function BonsaiLogo({ iconSize = 'w-8 h-8', showText = false, textSize = 'text-lg' }: BonsaiLogoProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Logo image: Official Bonsai monogram */}
      <img
        src="/bonsai-logo.png"
        alt="Bonsai Productivity"
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
