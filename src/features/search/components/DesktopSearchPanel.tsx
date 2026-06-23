/* DesktopSearchPanel: Popover content below the expanded desktop search bar */

import type { ReactNode } from 'react'
import { SearchPanelBody } from './SearchPanelBody'
import type { SearchQuickActionId, SearchResult } from '../types'

interface DesktopSearchPanelProps {
  className?: string
  query: string
  results: SearchResult[]
  loading?: boolean
  error?: string | null
  highlightedIndex: number
  onQuickAction: (id: SearchQuickActionId) => void
  onSelectResult: (result: SearchResult) => void
}

/** Keyboard hint chip for search footer */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-outline-variant/50 bg-surface-container-highest px-1 py-0.5 font-sans text-[11px] font-bold shadow-sm">
      {children}
    </kbd>
  )
}

/**
 * Search results popover: quick actions, live results, keyboard hints.
 */
export function DesktopSearchPanel({
  className = '',
  query,
  results,
  loading,
  error,
  highlightedIndex,
  onQuickAction,
  onSelectResult,
}: DesktopSearchPanelProps) {
  return (
    <div
      className={`flex max-h-[min(600px,calc(100vh-8rem))] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow ${className}`.trim()}
      role="dialog"
      aria-label="Search"
    >
      <div className="bonsai-scrollbar flex-1 overflow-y-auto p-2">
        <SearchPanelBody
          query={query}
          results={results}
          loading={loading}
          error={error}
          highlightedIndex={highlightedIndex}
          onQuickAction={onQuickAction}
          onSelectResult={onSelectResult}
        />
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-outline-variant/30 bg-surface-container-low/50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center text-[11px] text-on-surface-variant/70">
            <Kbd>Esc</Kbd>
            <span className="ml-1.5">close</span>
          </div>
          <div className="flex items-center text-[11px] text-on-surface-variant/70">
            <Kbd>Enter</Kbd>
            <span className="ml-1.5">select</span>
          </div>
          <div className="flex items-center text-[11px] text-on-surface-variant/70">
            <span className="mr-1.5 flex items-center gap-0.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </span>
            navigate
          </div>
        </div>
      </footer>
    </div>
  )
}
