/* GoalGauge component: Circular progress gauge visualization */
import type { ReactNode } from 'react'

interface GoalGaugeProps {
  /** Progress percentage (0-100) */
  progress: number
  /** Size of the gauge in pixels */
  size?: number
  /** Content to display in the center (e.g., goal name) */
  children?: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Circular progress gauge component.
 * Displays progress as a filled arc around a circle.
 * Uses Bonsai sage green color scheme for progress.
 */
export function GoalGauge({
  progress,
  size = 200,
  children,
  className = '',
}: GoalGaugeProps) {
  /* Clamp progress to 0-100 */
  const clampedProgress = Math.max(0, Math.min(100, progress))

  /* Calculate SVG dimensions */
  const strokeWidth = size * 0.1
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  /* Calculate progress arc length */
  const progressLength = (clampedProgress / 100) * circumference
  const offset = circumference - progressLength

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle: full circle in light gray */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-bonsai-slate-200"
        />
        {/* Progress circle: filled arc in sage green */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-bonsai-sage-600 transition-all duration-300"
        />
      </svg>
      {/* Center content: goal name or other content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">{children}</div>
        </div>
      )}
    </div>
  )
}
