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
  /** Optional: when true, widget body stretches to fill row height; disable for Line Up widget */
  stretchBody?: boolean
}

/**
 * Wrapper for dashboard widgets: title, optional action area, consistent padding/border, and (by default) uniform height.
 */
export function DashboardWidget({
  title,
  children,
  actions,
  fullWidth,
  stretchBody = true,
}: DashboardWidgetProps) {
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
      {/* Widget body: optionally flex-1 so widgets stretch to the same height within the grid */}
      <div className={stretchBody ? 'min-h-[180px] flex-1' : ''}>{children}</div>
    </div>
  )
}
