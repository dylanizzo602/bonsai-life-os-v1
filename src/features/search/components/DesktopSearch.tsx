/* DesktopSearch: Expanding search bar + results popover (lg+ only) */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { NavigationSection } from '../../layout/hooks/useNavigation'
import { useSearchPanel } from '../hooks/useSearchPanel'
import { DesktopSearchPanel } from './DesktopSearchPanel'

const EXPANDED_WIDTH = 'min(36rem, calc(100vw - 12rem))'
const EXPAND_MS = 300

interface DesktopSearchProps {
  /** Called when open state changes (e.g. hide center nav while expanded) */
  onOpenChange?: (open: boolean) => void
  onNavigate: (section: NavigationSection) => void
}

/**
 * Desktop header search: icon morphs into inline field, then results panel fades in.
 */
export function DesktopSearch({ onOpenChange, onNavigate }: DesktopSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  const setOpen = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      onOpenChange?.(open)
      if (!open) {
        setShowPanel(false)
      }
    },
    [onOpenChange],
  )

  const {
    query,
    setQuery,
    results,
    loading,
    error,
    highlightedIndex,
    handleQuickAction,
    handleSelectResult,
    reset,
  } = useSearchPanel({
    isOpen,
    onNavigate,
    onClose: () => setOpen(false),
  })

  const handleClose = useCallback(() => {
    reset()
    setOpen(false)
  }, [reset, setOpen])

  /* Open: focus input after width transition; reveal panel shortly after */
  useEffect(() => {
    if (!isOpen) return

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, EXPAND_MS)

    const panelTimer = window.setTimeout(() => {
      setShowPanel(true)
    }, EXPAND_MS + 50)

    return () => {
      window.clearTimeout(focusTimer)
      window.clearTimeout(panelTimer)
    }
  }, [isOpen])

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  /* Close on click outside */
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen, handleClose])

  return (
    <div ref={rootRef} className="absolute right-0 top-1/2 z-[60] -translate-y-1/2">
      {/* Expanding search field */}
      <div
        className="relative overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: isOpen ? EXPANDED_WIDTH : '2.5rem' }}
      >
        <div
          className={`relative flex h-10 items-center rounded-xl border transition-colors duration-300 ${
            isOpen
              ? 'border-outline-variant/50 bg-surface-container-low'
              : 'border-transparent bg-transparent'
          }`}
        >
          {/* Single search glyph — animates center (closed) → inset left (open) */}
          <MaterialIcon
            name="search"
            className={`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-primary transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isOpen
                ? 'left-3 translate-x-0 text-[20px]'
                : 'left-1/2 -translate-x-1/2 text-[24px]'
            }`}
          />

          {!isOpen ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute inset-0 z-20 rounded-full transition-colors hover:bg-surface-container-low active:scale-[0.98]"
              aria-label="Open search"
            />
          ) : null}

          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything..."
              aria-label="Search"
              aria-expanded={showPanel}
              className="h-10 w-full bg-transparent py-2.5 pr-4 pl-11 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          ) : null}
        </div>
      </div>

      {/* Results popover */}
      <div
        className={`absolute top-full right-0 mt-3 w-full transition-all duration-200 ${
          showPanel ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
        style={{ width: EXPANDED_WIDTH }}
        aria-hidden={!showPanel}
      >
        <DesktopSearchPanel
          query={query}
          results={results}
          loading={loading}
          error={error}
          highlightedIndex={highlightedIndex}
          onQuickAction={handleQuickAction}
          onSelectResult={handleSelectResult}
        />
      </div>
    </div>
  )
}
