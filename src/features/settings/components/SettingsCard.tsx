/* SettingsCard: White rounded container for a settings section body */

import type { ReactNode } from 'react'

interface SettingsCardProps {
  children: ReactNode
  className?: string
}

/**
 * Card shell matching zenith settings mock (surface-container-lowest, subtle border).
 */
export function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return (
    <div
      className={`rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 md:p-8 ${className}`.trim()}
    >
      {children}
    </div>
  )
}
