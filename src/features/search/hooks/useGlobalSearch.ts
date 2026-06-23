/* useGlobalSearch: Load search index and return ranked results for the query */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getGoals, getAllMilestones } from '../../../lib/supabase/goals'
import { getHabits } from '../../../lib/supabase/habits'
import { getNotes } from '../../../lib/supabase/notes'
import { getNoteFolders } from '../../../lib/supabase/noteFolders'
import { getAllNotePages } from '../../../lib/supabase/notePages'
import { getReflectionEntriesPage } from '../../../lib/supabase/reflections'
import { getTasks } from '../../../lib/supabase/tasks'
import { groupPagesByNoteId } from '../../notes/utils/pageTree'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { SearchIndexItem, SearchResult } from '../types'
import { buildSearchIndex } from '../utils/buildSearchIndex'
import { rankSearchResults } from '../utils/rankSearchMatch'

const DEBOUNCE_MS = 150

interface UseGlobalSearchReturn {
  results: SearchResult[]
  loading: boolean
  error: string | null
  indexItems: SearchIndexItem[]
  refreshIndex: () => void
}

/**
 * Global search hook: fetches entity index when search opens, debounces query,
 * returns top 10 ranked matches across all entity types.
 */
export function useGlobalSearch(query: string, isOpen: boolean): UseGlobalSearchReturn {
  const timeZone = useUserTimeZone()
  const [indexItems, setIndexItems] = useState<SearchIndexItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const fetchIdRef = useRef(0)

  /* Debounce search query */
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  /* Fetch search index when panel opens */
  const fetchIndex = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    try {
      setLoading(true)
      setError(null)

      const [tasks, habits, goals, milestones, reflectionsPage, notes, allPages, folders] =
        await Promise.all([
          getTasks({ includeAllTasks: true }),
          getHabits(),
          getGoals(),
          getAllMilestones(),
          getReflectionEntriesPage({ page: 1, pageSize: 200 }),
          getNotes(),
          getAllNotePages(),
          getNoteFolders(),
        ])

      if (fetchId !== fetchIdRef.current) return

      const pagesByNoteId = groupPagesByNoteId(allPages)
      const items = buildSearchIndex({
        tasks,
        habits,
        goals,
        milestones,
        reflections: reflectionsPage.entries,
        notes,
        pagesByNoteId,
        folders,
        timeZone,
      })

      setIndexItems(items)
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load search')
      console.error('Error loading global search index:', err)
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [timeZone])

  useEffect(() => {
    if (!isOpen) return
    void fetchIndex()
  }, [isOpen, fetchIndex])

  /* Rank results from cached index */
  const results = useMemo(
    () => rankSearchResults(indexItems, debouncedQuery),
    [indexItems, debouncedQuery],
  )

  return {
    results,
    loading,
    error,
    indexItems,
    refreshIndex: fetchIndex,
  }
}
