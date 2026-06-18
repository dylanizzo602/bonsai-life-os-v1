/* useReflections hook: Reflection entries list state, search/filter, load-more, and CRUD */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getReflectionEntriesPage,
  createReflectionEntry,
  updateReflectionEntry,
  deleteReflectionEntry,
} from '../../../lib/supabase/reflections'
import type { ReflectionEntry, UpdateReflectionEntryInput } from '../types'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

/**
 * Manages reflection entries for the Reflect landing page: paginated load-more,
 * debounced search, type filter, and journal CRUD.
 */
export function useReflections() {
  const [entries, setEntries] = useState<ReflectionEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  const fetchIdRef = useRef(0)

  /* Debounce search input before triggering refetch */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  /* Shared fetch helper */
  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      const fetchId = ++fetchIdRef.current
      try {
        if (append) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const { entries: pageEntries, total: totalCount } = await getReflectionEntriesPage({
          page: targetPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          types: typeFilter.length > 0 ? typeFilter : undefined,
        })

        if (fetchId !== fetchIdRef.current) return

        setTotal(totalCount)
        setPage(targetPage)
        setEntries((prev) => {
          if (!append) return pageEntries
          const seen = new Set(prev.map((e) => e.id))
          const merged = [...prev]
          for (const entry of pageEntries) {
            if (!seen.has(entry.id)) merged.push(entry)
          }
          return merged
        })
      } catch (err) {
        if (fetchId !== fetchIdRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load reflections')
        console.error('Error fetching reflection entries:', err)
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [debouncedSearch, typeFilter],
  )

  /* Initial fetch and refetch when search/filter changes */
  useEffect(() => {
    void fetchPage(1, false)
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (entries.length >= total || loadingMore) return
    void fetchPage(page + 1, true)
  }, [entries.length, total, loadingMore, fetchPage, page])

  const hasMore = entries.length < total

  const createJournalEntry = useCallback(async () => {
    try {
      setError(null)
      const entry = await createReflectionEntry({
        type: 'journal',
        title: 'Untitled',
        responses: { body: '' },
      })
      setEntries((prev) => [entry, ...prev])
      setTotal((prev) => prev + 1)
      return entry
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create journal entry'
      setError(message)
      throw err
    }
  }, [])

  const updateEntry = useCallback(async (id: string, input: UpdateReflectionEntryInput) => {
    try {
      setError(null)
      const updated = await updateReflectionEntry(id, input)
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update reflection'
      setError(message)
      throw err
    }
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteReflectionEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete reflection'
      setError(message)
      throw err
    }
  }, [])

  const refetch = useCallback(() => {
    void fetchPage(1, false)
  }, [fetchPage])

  return {
    entries,
    total,
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
    refetch,
  }
}
