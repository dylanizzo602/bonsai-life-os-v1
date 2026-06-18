/* AppFooter: Global site footer (login + authenticated app shell) */

interface AppFooterProps {
  /** Optional extra classes on the root footer element */
  className?: string
  /** When provided, shows a link to the in-app feedback page */
  onNavigateToFeedback?: () => void
}

/**
 * Shared footer with brand links and copyright.
 * Used on the auth screen and at the bottom of every authenticated page.
 */
export function AppFooter({ className = '', onNavigateToFeedback }: AppFooterProps) {
  return (
    <footer
      className={`mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 border-t border-outline-variant/10 bg-surface px-4 py-6 opacity-80 transition-opacity hover:opacity-100 md:flex-row md:px-8 ${className}`.trim()}
    >
      <div className="flex flex-col items-center gap-6 md:flex-row">
        <span className="font-headline text-sm font-bold text-primary">Bonsai</span>
        <nav className="flex gap-6" aria-label="Legal and support">
          <a
            className="font-body text-xs text-on-surface-variant transition-colors duration-200 hover:text-secondary"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            Privacy Policy
          </a>
          <a
            className="font-body text-xs text-on-surface-variant transition-colors duration-200 hover:text-secondary"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            Terms of Service
          </a>
          <a
            className="font-body text-xs text-on-surface-variant transition-colors duration-200 hover:text-secondary"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            Help Center
          </a>
          {onNavigateToFeedback && (
            <button
              type="button"
              className="font-body text-xs text-on-surface-variant transition-colors duration-200 hover:text-secondary"
              onClick={onNavigateToFeedback}
            >
              Feedback
            </button>
          )}
        </nav>
      </div>
      <p className="font-body text-xs text-on-surface-variant">
        © 2026 Bonsai Productivity. Mindfully crafted.
      </p>
    </footer>
  )
}
