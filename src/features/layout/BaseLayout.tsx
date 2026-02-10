/* Base layout: responsive shell with flexible grid/flex; content area uses min-w-0 for overflow */
import type { ReactNode } from 'react'

interface BaseLayoutProps {
  /** Main content to render inside the layout (e.g. route content or placeholder) */
  children: ReactNode
}

/**
 * Responsive base layout. Uses flex/grid and min-w-0 to avoid fixed-width assumptions.
 * Tailwind breakpoints (sm, md, lg, xl, 2xl) apply to child content as needed.
 */
export function BaseLayout({ children }: BaseLayoutProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      {/* Optional header slot; add when needed */}
      <header className="shrink-0 border-b border-gray-200 bg-white" aria-label="Site header">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <span className="text-lg font-medium text-gray-800">Bonsai Life OS</span>
        </div>
      </header>
      {/* Main content area: flex-1 and min-w-0 for responsive behavior */}
      <main className="min-w-0 flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
