/* DocumentTabsSidebar: Collapsible desktop sidebar + mobile/tablet bottom tab sheet */
import { useState, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DocumentTabsList } from './DocumentTabsList'
import type { NotePage, NotePageTreeNode } from '../types'

interface DocumentTabsSidebarProps {
  pageTree: NotePageTreeNode[]
  pages: NotePage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onAddTopLevelPage: () => void
  onAddSubpage: (parentPageId: string) => void
  onRenamePage: (pageId: string, title: string) => void
  onDeletePage: (pageId: string) => void
}

/**
 * Desktop (lg+): collapsible left sidebar.
 * Mobile/tablet (< lg): fixed bottom pill opens a bottom sheet to switch or add tabs.
 */
export function DocumentTabsSidebar({
  pageTree,
  pages,
  selectedPageId,
  onSelectPage,
  onAddTopLevelPage,
  onAddSubpage,
  onRenamePage,
  onDeletePage,
}: DocumentTabsSidebarProps) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  const selectedPage = pages.find((p) => p.id === selectedPageId)
  const selectedLabel = selectedPage?.title?.trim() || 'Untitled'

  /* Shared handlers: close mobile sheet after navigation */
  const handleSelectPage = (pageId: string) => {
    onSelectPage(pageId)
    setMobileSheetOpen(false)
  }

  const handleAddTopLevelPage = () => {
    onAddTopLevelPage()
    setMobileSheetOpen(false)
  }

  /* Lock body scroll while mobile sheet is open */
  useEffect(() => {
    if (!mobileSheetOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSheetOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileSheetOpen])

  const listProps = {
    pageTree,
    selectedPageId,
    onSelectPage: handleSelectPage,
    onRenamePage,
    onAddSubpage,
    onDeletePage,
  }

  return (
    <>
      {/* Desktop: collapsible sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-outline-variant/20 bg-surface transition-[width] duration-200 lg:flex ${
          desktopCollapsed ? 'w-12' : 'w-64'
        }`}
        aria-label="Document tabs"
      >
        {desktopCollapsed ? (
          <div className="flex flex-col items-center gap-2 p-2">
            <button
              type="button"
              onClick={() => setDesktopCollapsed(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              aria-label="Expand document tabs"
            >
              <MaterialIcon name="side_navigation" className="text-[22px]" />
            </button>
            <span
              className="max-w-[2.5rem] truncate text-center text-[10px] font-medium text-on-surface-variant"
              title={selectedLabel}
            >
              {selectedLabel}
            </span>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-secondary font-medium text-on-surface-variant">Document tabs</h2>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onAddTopLevelPage}
                  className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                  aria-label="Add page"
                >
                  <MaterialIcon name="add" className="text-[20px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopCollapsed(true)}
                  className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                  aria-label="Collapse document tabs"
                >
                  <MaterialIcon name="chevron_left" className="text-[20px]" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DocumentTabsList {...listProps} />
            </div>
          </div>
        )}
      </aside>

      {/* Mobile/tablet: bottom tab pill (hidden while sheet is open) */}
      {!mobileSheetOpen && (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-5 py-3 shadow-lg transition-colors hover:bg-surface-container-low active:scale-[0.98]"
          aria-label="Open document tabs"
          aria-haspopup="dialog"
          aria-expanded={mobileSheetOpen}
        >
          <MaterialIcon name="description" className="text-[20px] text-on-surface-variant" />
          <span className="truncate text-body font-medium text-on-surface">{selectedLabel}</span>
        </button>
      </div>
      )}

      {/* Mobile/tablet: bottom sheet with tab list */}
      {mobileSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:hidden"
          onClick={() => setMobileSheetOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[min(85vh,520px)] w-full flex-col rounded-t-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
            role="dialog"
            aria-label="Document tabs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
              <h2 className="text-body font-semibold text-on-surface">Document tabs</h2>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                aria-label="Close"
              >
                <MaterialIcon name="close" className="text-[22px]" />
              </button>
            </div>

            {/* Scrollable tab list */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <DocumentTabsList {...listProps} />
            </div>

            {/* Add tab CTA */}
            <div className="border-t border-outline-variant/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleAddTopLevelPage}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-body font-semibold text-on-primary transition-colors hover:bg-primary-container active:scale-[0.98]"
              >
                <MaterialIcon name="add" className="text-[20px]" />
                Add tab
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
