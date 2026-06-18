/* useNoteFolders hook: Manages note folder list and CRUD via the data layer */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getNoteFolders,
  createNoteFolder as createNoteFolderApi,
  updateNoteFolder as updateNoteFolderApi,
  deleteNoteFolder as deleteNoteFolderApi,
} from '../../../lib/supabase/noteFolders'
import type {
  NoteFolder,
  CreateNoteFolderInput,
  UpdateNoteFolderInput,
  Note,
} from '../types'
import { countNotesByFolder } from '../utils/noteDisplay'

/**
 * Custom hook for managing note folders and derived note counts.
 */
export function useNoteFolders(notes: Note[]) {
  const [folders, setFolders] = useState<NoteFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Derived note counts per folder from the shared notes list */
  const noteCountByFolderId = useMemo(() => countNotesByFolder(notes), [notes])

  /* Fetch all folders from the data layer */
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getNoteFolders()
      setFolders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders')
      console.error('Error fetching note folders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Initial fetch on mount */
  useEffect(() => {
    void fetchFolders()
  }, [fetchFolders])

  /* Create a new folder */
  const createFolder = useCallback(async (input: CreateNoteFolderInput) => {
    try {
      setError(null)
      const folder = await createNoteFolderApi(input)
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)))
      return folder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create folder'
      setError(message)
      throw err
    }
  }, [])

  /* Update an existing folder */
  const updateFolder = useCallback(async (id: string, input: UpdateNoteFolderInput) => {
    try {
      setError(null)
      const updated = await updateNoteFolderApi(id, input)
      setFolders((prev) =>
        prev
          .map((f) => (f.id === id ? updated : f))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update folder'
      setError(message)
      throw err
    }
  }, [])

  /* Delete a folder */
  const deleteFolder = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteNoteFolderApi(id)
      setFolders((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete folder'
      setError(message)
      throw err
    }
  }, [])

  return {
    folders,
    loading,
    error,
    noteCountByFolderId,
    refetch: fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  }
}
