/* MobileSearch: Full-screen search page for mobile/tablet (below lg) */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { NavigationSection } from '../../layout/hooks/useNavigation'
import { useSearchPanel } from '../hooks/useSearchPanel'
import { SearchPanelBody } from './SearchPanelBody'

interface MobileSearchProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (section: NavigationSection) => void
}

/**
 * Mobile/tablet search: dedicated full-screen page (not a modal); opaque surface background.
 */
export function MobileSearch({ isOpen, onClose, onNavigate }: MobileSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    query,
    setQuery,
    results,
    loading,
    error,
    highlightedIndex,
    handleQuickAction,
    handleSelectResult,
    closePanel,
  } = useSearchPanel({
    isOpen,
    onNavigate,
    onClose,
  })

  /* Lock scroll and focus input when opened */
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
    }
  }, [isOpen])

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePanel()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closePanel])

  if (!isOpen) return null

  const searchScreen = (
    <div
      className="fixed inset-0 z-[60] flex min-h-dvh w-full flex-col bg-surface text-on-surface lg:hidden"
      role="search"
      aria-label="Search"
    >
      {/* Header: close + search field */}
      <header className="shrink-0 p-6 pb-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={closePanel}
            className="-ml-2 p-2 text-on-surface-variant transition-all active:scale-95"
            aria-label="Close search"
          >
            <MaterialIcon name="close" className="text-[24px]" />
          </button>
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-primary"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything..."
              aria-label="Search"
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low py-2.5 pr-4 pl-12 text-sm transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Results card */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow">
          <div className="bonsai-scrollbar flex-1 overflow-y-auto p-2">
            <SearchPanelBody
              compactQuickActions
              query={query}
              results={results}
              loading={loading}
              error={error}
              highlightedIndex={highlightedIndex}
              onQuickAction={handleQuickAction}
              onSelectResult={handleSelectResult}
            />
          </div>
          <footer className="shrink-0 border-t border-outline-variant/30 bg-surface-container-low/50 px-4 py-3" />
        </div>
      </main>
    </div>
  )

  return createPortal(searchScreen, document.body)
}
