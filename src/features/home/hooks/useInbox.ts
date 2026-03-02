/* useInbox hook: Fetch and mutate inbox items for the home dashboard Inbox widget */

import { useState, useEffect, useCallback } from 'react'
import {
  getInboxItems,
  createInboxItem,
  updateInboxItem,
  deleteInboxItem,
} from '../../../lib/supabase/inbox'
import type { InboxItem, CreateInboxItemInput, UpdateInboxItemInput } from '../types'

/**
 * Hook for inbox items: list, loading, error, add, update, delete, refetch.
 */
export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch inbox items on mount and when refetch is called */
  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInboxItems()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const addItem = useCallback(async (input: CreateInboxItemInput): Promise<InboxItem> => {
    const item = await createInboxItem(input)
    setItems((prev) => [...prev, item].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)))
    return item
  }, [])

  const updateItem = useCallback(
    async (id: string, input: UpdateInboxItemInput): Promise<InboxItem> => {
      const updated = await updateInboxItem(id, input)
      setItems((prev) =>
        prev.map((i) => (i.id === id ? updated : i)).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
      )
      return updated
    },
    [],
  )

  const removeItem = useCallback(async (id: string): Promise<void> => {
    await deleteInboxItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem: removeItem,
    refetch: fetchItems,
  }
}
