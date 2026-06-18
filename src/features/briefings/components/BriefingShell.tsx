/* BriefingShell: Shared layout wrapper + inline header controls for briefing steps */

import type { ReactNode } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'

interface BriefingShellProps {
  children: ReactNode
  /** Extra classes on outer wrapper */
  className?: string
}

/**
 * Briefing content wrapper with bottom padding for the fixed progress footer.
 */
export function BriefingShell({ children, className = '' }: BriefingShellProps) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-4 pb-40 pt-6 md:px-8 md:pt-8 ${className}`}>
      {children}
    </div>
  )
}

interface BriefingScreenHeadingProps {
  /** Page title */
  title: ReactNode
  /** Optional subtitle below title */
  description?: ReactNode
  onBack?: () => void
  onClose?: () => void
  /** Center title and description (close stays top-right) */
  centered?: boolean
  className?: string
}

/**
 * Title block with back/close aligned to the header row.
 */
export function BriefingScreenHeading({
  title,
  description,
  onBack,
  onClose,
  centered = false,
  className = '',
}: BriefingScreenHeadingProps) {
  if (centered) {
    return (
      <div className={`relative mb-12 ${className}`}>
        {onBack != null ? (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
            aria-label="Go back"
          >
            <MaterialIcon name="arrow_back" className="text-on-surface-variant" />
          </button>
        ) : null}
        {onClose != null ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
            aria-label="Close briefing"
          >
            <MaterialIcon name="close" className="text-on-surface-variant" />
          </button>
        ) : null}
        <div className="text-center">
          <h1 className="text-page-title mb-2 font-semibold tracking-tight text-on-surface">{title}</h1>
          {description != null ? (
            <p className="text-body text-on-surface-variant">{description}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-1">
          {onBack != null ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Go back"
            >
              <MaterialIcon name="arrow_back" className="text-on-surface-variant" />
            </button>
          ) : null}
          <h1 className="text-page-title min-w-0 font-semibold text-on-surface">{title}</h1>
        </div>
        {onClose != null ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
            aria-label="Close briefing"
          >
            <MaterialIcon name="close" className="text-on-surface-variant" />
          </button>
        ) : null}
      </div>
      {description != null ? (
        <p className={`text-body mt-2 text-on-surface-variant ${onBack != null ? 'pl-10' : ''}`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
