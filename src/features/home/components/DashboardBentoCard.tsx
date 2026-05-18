/* DashboardBentoCard: Bento grid card shell with title, optional icon, and actions */

import type { ReactNode } from 'react'

export interface DashboardBentoCardProps {
  /** Card title */
  title: string
  /** Optional leading icon beside the title */
  titleIcon?: ReactNode
  /** Main content */
  children: ReactNode
  /** Optional header actions (e.g. add button) */
  actions?: ReactNode
  /** Optional extra classes on the outer card */
  className?: string
}

/**
 * Shared shell for home dashboard bento widgets: rounded card, border, hover shadow.
 */
export function DashboardBentoCard({
  title,
  titleIcon,
  children,
  actions,
  className = '',
}: DashboardBentoCardProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-outline-variant/40 bg-surface p-6 transition-shadow duration-300 hover:ambient-shadow-dashboard md:p-8 ${className}`}
    >
      {/* Header: icon + title + optional actions */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-body font-medium text-on-surface">
          {titleIcon != null ? (
            <span className="text-outline" aria-hidden>
              {titleIcon}
            </span>
          ) : null}
          {title}
        </h2>
        {actions != null ? <div className="flex shrink-0 items-center">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
