/* useNotes hook: Manages notes list state and CRUD via the notes data layer */
import { useState, useEffect, useCallback } from 'react'
import {
  getNotes,
  createNote as createNoteApi,
  updateNote as updateNoteApi,
  deleteNote as deleteNoteApi,
} from '../../../lib/supabase/notes'
import type { Note, CreateNoteInput, UpdateNoteInput } from '../types'

/**
 * Custom hook for managing the notes list, loading/error state, and CRUD operations.
 * Used by both list view and document view (current note resolved from list by id).
 */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch all notes from the data layer */
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getNotes()
      setNotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Initial fetch on mount */
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  /* Create a new note and return it (caller can set selectedNoteId to open it) */
  const createNote = useCallback(
    async (input: CreateNoteInput = {}) => {
      try {
        setError(null)
        const newNote = await createNoteApi(input)
        setNotes((prev) => [newNote, ...prev])
        return newNote
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create note'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Update an existing note; list state is updated so doc view stays in sync */
  const updateNote = useCallback(
    async (id: string, input: UpdateNoteInput) => {
      try {
        setError(null)
        const updated = await updateNoteApi(id, input)
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
        return updated
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update note'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Delete a note and remove it from list state */
  const deleteNote = useCallback(
    async (id: string) => {
      try {
        setError(null)
        await deleteNoteApi(id)
        setNotes((prev) => prev.filter((n) => n.id !== id))
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete note'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  return {
    notes,
    loading,
    error,
    refetch: fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  }
}
