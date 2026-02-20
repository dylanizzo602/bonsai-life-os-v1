/* Reflections page: List reflection entries (e.g. morning briefings); open one to view overview */

import { useCallback, useEffect, useState } from 'react'
import { getReflectionEntries, getReflectionEntry } from '../../lib/supabase/reflections'
import type { ReflectionEntry, MorningBriefingResponses } from './types'
import { ReflectionEntryView } from './ReflectionEntryView'

/**
 * Reflections section: lists saved reflection entries (e.g. morning briefings).
 * Clicking an entry shows the full overview (same Q&A as in Briefing).
 */
export function ReflectionsPage() {
  /* List of all entries (newest first) */
  const [entries, setEntries] = useState<ReflectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /* When set, we show the detail view for this entry */
  const [selectedEntry, setSelectedEntry] = useState<ReflectionEntry | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  /* Fetch entries list on mount */
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getReflectionEntries()
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reflections')
      console.error('Error fetching reflection entries:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

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
  return (
    <div className="min-h-full">
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Reflections</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-body text-bonsai-slate-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-body text-bonsai-slate-600">
          No reflection entries yet. Complete a morning briefing in the Briefing section to see your first entry here.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => handleSelectEntry(entry)}
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
      )}
    </div>
  )
}
