/* Reflections page: Landing with briefing cards, recent entries, and list/detail/journal views */

import { useCallback, useEffect, useState } from 'react'
import { getReflectionEntry } from '../../lib/supabase/reflections'
import { GoalReflectionEntryView } from './components/GoalReflectionEntryView'
import type { ReflectionEntry, MorningBriefingResponses, GoalReflectionResponses } from './types'
import { ReflectionEntryView } from './ReflectionEntryView'
import { BriefingsSection } from './components/BriefingsSection'
import { RecentEntriesSection } from './components/RecentEntriesSection'
import { JournalEntryEditor } from './components/JournalEntryEditor'
import { WeeklyEntryView } from './components/WeeklyEntryView'
import { useReflections } from './hooks/useReflections'
import { useBriefingStatus } from './hooks/useBriefingStatus'
import { peekSearchOpenIntent, clearSearchOpenIntent } from '../search/searchOpenIntent'

interface ReflectionsPageProps {
  /** Open morning briefing; pass true to continue today's session from the greeting */
  onOpenMorningBriefing?: (continueSession?: boolean) => void
}

/** View mode: list landing, read-only detail, or journal editor */
type ViewMode = 'list' | 'detail' | 'journal'

/**
 * Reflections section: briefing cards, searchable entry list, and type-specific detail views.
 */
export function ReflectionsPage({ onOpenMorningBriefing }: ReflectionsPageProps) {
  const {
    entries,
    loading,
    loadingMore,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    loadMore,
    hasMore,
    createJournalEntry,
    updateEntry,
    deleteEntry,
  } = useReflections()

  const {
    hasCompletedMorningToday,
    todaysMorningEntry,
  } = useBriefingStatus()

  /* View routing: list vs detail vs journal editor */
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedEntry, setSelectedEntry] = useState<ReflectionEntry | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  /* Context menu state for delete on right-click */
  const [contextEntry, setContextEntry] = useState<ReflectionEntry | null>(null)
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  /* Close context menu on outside click */
  useEffect(() => {
    if (!contextEntry) return
    const close = () => setContextEntry(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [contextEntry])

  /* Load full entry and open appropriate detail view by type */
  const openEntry = useCallback(async (entry: ReflectionEntry) => {
    setDetailLoading(true)
    try {
      const full = (await getReflectionEntry(entry.id)) ?? entry
      setSelectedEntry(full)
      setViewMode(full.type === 'journal' ? 'journal' : 'detail')
    } catch {
      setSelectedEntry(entry)
      setViewMode(entry.type === 'journal' ? 'journal' : 'detail')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  /* Global search: open reflection entry from search result */
  useEffect(() => {
    const intent = peekSearchOpenIntent()
    if (intent?.kind !== 'reflection') return

    const existing = entries.find((e) => e.id === intent.id)
    if (existing) {
      clearSearchOpenIntent()
      void openEntry(existing)
      return
    }

    let cancelled = false
    void getReflectionEntry(intent.id).then((entry) => {
      if (cancelled || !entry) return
      clearSearchOpenIntent()
      void openEntry(entry)
    })
    return () => {
      cancelled = true
    }
  }, [entries, openEntry])

  const handleBackToList = useCallback(() => {
    setSelectedEntry(null)
    setViewMode('list')
  }, [])

  /* New journal entry: create and open editor */
  const handleNewEntry = useCallback(async () => {
    try {
      const entry = await createJournalEntry()
      setSelectedEntry(entry)
      setViewMode('journal')
    } catch {
      /* Error surfaced in hook */
    }
  }, [createJournalEntry])

  /* Delete entry from context menu */
  const handleDeleteEntry = useCallback(
    async (entry: ReflectionEntry) => {
      const confirmed = window.confirm('Delete this reflection? This cannot be undone.')
      if (!confirmed) return
      try {
        await deleteEntry(entry.id)
        if (selectedEntry?.id === entry.id) {
          handleBackToList()
        }
      } catch {
        /* Error surfaced in hook */
      }
    },
    [deleteEntry, selectedEntry, handleBackToList],
  )

  const handleEntryContextMenu = useCallback(
    (entry: ReflectionEntry, event: React.MouseEvent) => {
      event.preventDefault()
      setContextEntry(entry)
      setContextPosition({ x: event.clientX, y: event.clientY })
    },
    [],
  )

  /* Detail / journal views */
  if (viewMode !== 'list' && selectedEntry) {
    if (detailLoading) {
      return (
        <div className="min-h-full">
          <p className="text-body text-bonsai-slate-500">Loading…</p>
        </div>
      )
    }

    if (viewMode === 'journal' || selectedEntry.type === 'journal') {
      return (
        <div className="min-h-full">
          <JournalEntryEditor
            key={selectedEntry.id}
            entry={selectedEntry}
            onBack={handleBackToList}
            onUpdate={async (id, input) => {
              const updated = await updateEntry(id, input)
              setSelectedEntry(updated)
            }}
            onDelete={async () => handleDeleteEntry(selectedEntry)}
          />
        </div>
      )
    }

    if (selectedEntry.type === 'weekly_briefing') {
      return (
        <div className="min-h-full">
          <WeeklyEntryView entry={selectedEntry} onBack={handleBackToList} />
        </div>
      )
    }

    if (selectedEntry.type === 'goal') {
      return (
        <div className="min-h-full">
          <GoalReflectionEntryView
            title={selectedEntry.title}
            responses={selectedEntry.responses as GoalReflectionResponses}
            backLabel="Back to list"
            onBack={handleBackToList}
          />
        </div>
      )
    }

    return (
      <div className="min-h-full">
        <ReflectionEntryView
          title={selectedEntry.title}
          responses={selectedEntry.responses as MorningBriefingResponses}
          backLabel="Back to list"
          onBack={handleBackToList}
        />
      </div>
    )
  }

  /* List landing view */
  return (
    <div className="min-h-full overflow-x-hidden">
      {/* Page hero */}
      <div className="flex flex-col gap-1 pb-6 pt-2">
        <h1 className="text-page-title font-bold text-on-surface">Reflections</h1>
        <p className="text-secondary text-on-surface-variant">
          Capture your thoughts, review your progress, and cultivate mindfulness.
        </p>
      </div>

      {/* Briefing cards */}
      <BriefingsSection
        hasCompletedMorningToday={hasCompletedMorningToday}
        todaysMorningEntry={todaysMorningEntry}
        onOpenMorningBriefing={onOpenMorningBriefing}
      />

      {/* Recent entries list */}
      <RecentEntriesSection
        entries={entries}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onNewEntry={handleNewEntry}
        onEntryClick={openEntry}
        onEntryContextMenu={handleEntryContextMenu}
      />

      {/* Right-click delete context menu */}
      {contextEntry && (
        <div
          className="fixed z-[10000] rounded-xl border border-bonsai-slate-200 bg-bonsai-brown-50 py-1 shadow-lg"
          style={{ left: contextPosition.x, top: contextPosition.y, minWidth: 160 }}
          role="menu"
          aria-label="Reflection options"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await handleDeleteEntry(contextEntry)
              setContextEntry(null)
            }}
            className="w-full rounded-none px-4 py-2 text-left text-body text-bonsai-slate-800 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-bonsai-slate-100"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
