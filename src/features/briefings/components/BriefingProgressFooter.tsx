/* BriefingProgressFooter: Fixed bottom progress bar for the morning briefing flow */

import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

export interface BriefingProgressFooterProps {
  percentComplete: number
  /** Optional primary action above the progress bar */
  action?: ReactNode
  /** Hide on completion when screen renders its own 100% bar */
  hidden?: boolean
}

/**
 * Shared footer: optional CTA + "Morning Briefing" progress label and bar.
 */
export function BriefingProgressFooter({
  percentComplete,
  action,
  hidden = false,
}: BriefingProgressFooterProps) {
  if (hidden) return null

  const percent = Math.min(100, Math.max(0, percentComplete))

  /* Portal: escape BaseLayout scroll container so fixed positioning stays viewport-pinned */
  const footer = (
    <div
      className="fixed inset-x-0 bottom-0 z-[45] bg-gradient-to-t from-surface via-surface to-transparent pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="Morning briefing progress"
    >
      <div className="mx-auto w-full max-w-5xl px-4 pb-6 pt-4 md:px-8">
        {/* Optional step CTA slot */}
        {action != null ? <div className="mb-4 flex justify-center">{action}</div> : null}

        {/* Progress label + bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-secondary text-xs font-bold uppercase tracking-widest">
            <span>Morning Briefing</span>
            <span className="text-primary">{percent}% Complete</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(footer, document.body)
}
