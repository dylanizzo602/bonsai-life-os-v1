/* Reflections page: List reflection entries (e.g. morning briefings); open one to view overview and show right-click menu for delete */

import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import {
  getReflectionEntriesPage,
  getReflectionEntry,
  deleteReflectionEntry,
  getHasCompletedMorningBriefingToday,
  getHasCompletedWeeklyBriefingThisWeek,
  getMorningBriefingStreak,
  getWeeklyBriefingStreak,
} from '../../lib/supabase/reflections'
import type { ReflectionEntry, MorningBriefingResponses } from './types'
import { ReflectionEntryView } from './ReflectionEntryView'
import { useUserTimeZone } from '../settings/useUserTimeZone'

interface ReflectionsPageProps {
  /** Optional handler to open the morning briefing flow */
  onOpenMorningBriefing?: () => void
  /** Optional handler to open the weekly briefing flow */
  onOpenWeeklyBriefing?: () => void
}

/**
 * Reflections section: lists saved reflection entries and provides shortcuts to open briefing flows.
 * Clicking an entry shows the full overview (same Q&A as in Briefing).
 */
export function ReflectionsPage({ onOpenMorningBriefing, onOpenWeeklyBriefing }: ReflectionsPageProps) {
  /* Pagination: page-based listing, fixed to 25 entries per page */
  const PAGE_SIZE = 25
  const [page, setPage] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)

  /* List of entries for the current page (newest first) */
  const [entries, setEntries] = useState<ReflectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /* When set, we show the detail view for this entry */
  const [selectedEntry, setSelectedEntry] = useState<ReflectionEntry | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  /* Context menu state: which entry is open and at what position (matches task context menu pattern) */
  const [contextEntry, setContextEntry] = useState<ReflectionEntry | null>(null)
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  /* Briefing status: whether morning briefing is done today and weekly briefing is done this week */
  const [hasCompletedMorningToday, setHasCompletedMorningToday] = useState<boolean | null>(null)
  const [hasCompletedWeeklyThisWeek, setHasCompletedWeeklyThisWeek] = useState<boolean | null>(null)
  /* Briefing streaks: consecutive completions ending today/this week */
  const [morningStreakDays, setMorningStreakDays] = useState<number | null>(null)
  const [weeklyStreakWeeks, setWeeklyStreakWeeks] = useState<number | null>(null)
  /* Timezone: ensures “completed today” uses the user's zoned calendar day */
  const timeZone = useUserTimeZone()

  /* Delete handler: allow user to delete an entry (invoked from right-click on list item) */
  const handleDeleteEntry = useCallback(
    async (entry: ReflectionEntry) => {
      const confirmed = window.confirm('Delete this reflection? This cannot be undone.')
      if (!confirmed) return
      try {
        await deleteReflectionEntry(entry.id)
        /* Optimistic UI update: remove entry from current page and adjust totals */
        setEntries((prev) => prev.filter((e) => e.id !== entry.id))
        setTotalEntries((prev) => Math.max(0, prev - 1))
        if (selectedEntry?.id === entry.id) {
          setSelectedEntry(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete reflection')
        console.error('Error deleting reflection entry:', err)
      }
    },
    [selectedEntry],
  )

  /* Fetch entries list for the current page */
  const fetchEntries = useCallback(async (targetPage: number) => {
    try {
      setLoading(true)
      setError(null)
      const { entries: pageEntries, total } = await getReflectionEntriesPage({
        page: targetPage,
        pageSize: PAGE_SIZE,
      })
      setEntries(pageEntries)
      setTotalEntries(total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reflections')
      console.error('Error fetching reflection entries:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries(page)
  }, [fetchEntries, page])

  /* Keep the page number valid after deletes or count changes (e.g. last page becomes empty) */
  useEffect(() => {
    if (loading) return
    const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
    if (page > totalPages) {
      setPage(totalPages)
    } else if (entries.length === 0 && page > 1 && totalEntries > 0) {
      setPage((p) => Math.max(1, p - 1))
    }
  }, [entries.length, loading, page, totalEntries])

  /* Fetch briefing completion status on mount */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [morningDone, weeklyDone, morningStreak, weeklyStreak] = await Promise.all([
          getHasCompletedMorningBriefingToday(timeZone),
          getHasCompletedWeeklyBriefingThisWeek(),
          getMorningBriefingStreak(timeZone),
          getWeeklyBriefingStreak(timeZone),
        ])
        if (!cancelled) {
          setHasCompletedMorningToday(morningDone)
          setHasCompletedWeeklyThisWeek(weeklyDone)
          setMorningStreakDays(morningStreak)
          setWeeklyStreakWeeks(weeklyStreak)
        }
      } catch {
        if (!cancelled) {
          setHasCompletedMorningToday(false)
          setHasCompletedWeeklyThisWeek(false)
          setMorningStreakDays(0)
          setWeeklyStreakWeeks(0)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [timeZone])

  /* When user clicks an entry, load full entry and show detail */
  const handleSelectEntry = useCallback(async (entry: ReflectionEntry) => {
    setDetailLoading(true)
    try {
      const full = await getReflectionEntry(entry.id)
      setSelectedEntry(full ?? entry)
    } catch {
      setSelectedEntry(entry)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedEntry(null)
  }, [])

  /* Detail view: show selected entry overview */
  if (selectedEntry) {
    return (
      <div className="min-h-full">
        <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Reflections</h1>
        {detailLoading ? (
          <p className="text-body text-bonsai-slate-500">Loading...</p>
        ) : (
          <ReflectionEntryView
            title={selectedEntry.title}
            responses={selectedEntry.responses as MorningBriefingResponses}
            backLabel="Back to list"
            onBack={handleBackToList}
          />
        )}
      </div>
    )
  }

  /* List view */
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
  return (
    <div className="min-h-full">
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Reflections</h1>

      {/* Briefing shortcuts: Buttons to open morning and weekly briefing flows from Reflections */}
      <div className="mb-6 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-body text-bonsai-slate-700">
            Open your briefing flows directly from Reflections.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-secondary text-bonsai-slate-600">
            <span>
              Morning:{' '}
              {hasCompletedMorningToday == null
                ? 'Checking...'
                : hasCompletedMorningToday
                  ? 'Completed today'
                  : 'Not completed today'}
              {morningStreakDays == null ? '' : ` • Streak: ${morningStreakDays} day${morningStreakDays === 1 ? '' : 's'}`}
            </span>
            <span className="hidden md:inline-block">•</span>
            <span>
              Weekly:{' '}
              {hasCompletedWeeklyThisWeek == null
                ? 'Checking...'
                : hasCompletedWeeklyThisWeek
                  ? 'Completed this week'
                  : 'Not completed this week'}
              {weeklyStreakWeeks == null ? '' : ` • Streak: ${weeklyStreakWeeks} week${weeklyStreakWeeks === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenMorningBriefing}
            disabled={!onOpenMorningBriefing}
          >
            Open morning briefing
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenWeeklyBriefing}
            disabled={!onOpenWeeklyBriefing}
          >
            Open weekly briefing
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-body text-bonsai-slate-500">Loading...</p>
      ) : totalEntries === 0 ? (
        <p className="text-body text-bonsai-slate-600">
          No reflection entries yet. Complete a morning briefing to see your first entry here.
        </p>
      ) : (
        <>
          {/* Entries list: only the current page is rendered */}
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => handleSelectEntry(entry)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setContextEntry(entry)
                    setContextPosition({ x: event.clientX, y: event.clientY })
                  }}
                  className="w-full rounded-lg border border-bonsai-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-bonsai-slate-50"
                >
                  <span className="text-body font-medium text-bonsai-brown-700">
                    {entry.title ?? 'Untitled reflection'}
                  </span>
                  <span className="ml-2 text-secondary text-bonsai-slate-500">
                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Pagination controls: navigate between pages of 25 entries */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-secondary text-bonsai-slate-600">
              Page {page} of {totalPages} • {totalEntries} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Simple context menu for reflections: currently only Delete to match task right-click behavior */}
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
            className="w-full px-4 py-2 text-left text-body text-bonsai-slate-800 hover:bg-bonsai-slate-100 transition-colors rounded-none first:rounded-t-xl last:rounded-b-xl"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
