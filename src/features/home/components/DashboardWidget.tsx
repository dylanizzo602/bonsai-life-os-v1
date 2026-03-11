/* DashboardWidget: Shared shell for dashboard widgets with title and optional actions */

import type { ReactNode } from 'react'

export interface DashboardWidgetProps {
  /** Widget title (e.g. "Line Up", "Inbox") */
  title: string
  /** Main content */
  children: ReactNode
  /** Optional right-side actions (View All, + Add, etc.) */
  actions?: ReactNode
  /** Optional: full width on desktop (e.g. for Line Up) */
  fullWidth?: boolean
}

/**
 * Wrapper for dashboard widgets: title, optional action area, consistent padding/border, and uniform height.
 */
export function DashboardWidget({ title, children, actions, fullWidth }: DashboardWidgetProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border border-bonsai-slate-200 bg-white p-4 md:p-6 shadow-sm ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {/* Widget header: title and optional actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-bonsai-brown-700">{title}</h2>
        {actions != null ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {/* Widget body: flex-1 so all widgets stretch to the same height within the grid */}
      <div className="min-h-[180px] flex-1">{children}</div>
    </div>
  )
}
