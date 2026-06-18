/* useNotes hook: Manages notes list state and CRUD via the notes data layer */
import { useState, useEffect, useCallback } from 'react'
import {
  getNotes,
  createNote as createNoteApi,
  updateNote as updateNoteApi,
  deleteNote as deleteNoteApi,
} from '../../../lib/supabase/notes'
import { getAllNotePages, getPagesForNote } from '../../../lib/supabase/notePages'
import { uploadNoteCover, deleteNoteCover } from '../../../lib/supabase/storage'
import type { Note, NotePage, CreateNoteInput, UpdateNoteInput } from '../types'
import { groupPagesByNoteId } from '../utils/pageTree'

/**
 * Custom hook for managing note documents, pages index, and CRUD.
 */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [pagesByNoteId, setPagesByNoteId] = useState<Record<string, NotePage[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch notes and all pages for library search/previews */
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [data, allPages] = await Promise.all([getNotes(), getAllNotePages()])
      setNotes(data)
      setPagesByNoteId(groupPagesByNoteId(allPages))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotes()
  }, [fetchNotes])

  /* Bump note in local list after page edits (updated_at from DB trigger on refetch) */
  const bumpNoteInList = useCallback((noteId: string) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === noteId)
      if (idx < 0) return prev
      const note = { ...prev[idx], updated_at: new Date().toISOString() }
      const next = [...prev]
      next.splice(idx, 1)
      return [note, ...next]
    })
  }, [])

  /* Refresh pages index for one note after page CRUD */
  const refreshPagesForNote = useCallback(async (noteId: string) => {
    const pages = await getPagesForNote(noteId)
    setPagesByNoteId((prev) => ({ ...prev, [noteId]: pages }))
    bumpNoteInList(noteId)
  }, [bumpNoteInList])

  /* Create a new note document with first page */
  const createNote = useCallback(async (input: CreateNoteInput = {}) => {
    try {
      setError(null)
      const newNote = await createNoteApi(input)
      const pages = await getPagesForNote(newNote.id)
      setPagesByNoteId((prev) => ({ ...prev, [newNote.id]: pages }))
      setNotes((prev) => [newNote, ...prev])
      return newNote
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note'
      setError(errorMessage)
      throw err
    }
  }, [])

  const updateNote = useCallback(async (id: string, input: UpdateNoteInput) => {
    try {
      setError(null)
      const updated = await updateNoteApi(id, input)
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
      return updated
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note'
      setError(errorMessage)
      throw err
    }
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    try {
      setError(null)
      const note = notes.find((n) => n.id === id)
      if (note?.cover_storage_path) {
        try {
          await deleteNoteCover(note.cover_storage_path)
        } catch (coverErr) {
          console.error('Error deleting note cover from storage:', coverErr)
        }
      }
      await deleteNoteApi(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      setPagesByNoteId((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note'
      setError(errorMessage)
      throw err
    }
  }, [notes])

  const uploadCover = useCallback(
    async (noteId: string, file: File) => {
      const existing = notes.find((n) => n.id === noteId)
      const uploaded = await uploadNoteCover(noteId, file)

      if (existing?.cover_storage_path && existing.cover_storage_path !== uploaded.storagePath) {
        try {
          await deleteNoteCover(existing.cover_storage_path)
        } catch (coverErr) {
          console.error('Error removing previous note cover:', coverErr)
        }
      }

      return updateNote(noteId, {
        cover_image_url: uploaded.url,
        cover_storage_path: uploaded.storagePath,
      })
    },
    [notes, updateNote],
  )

  const removeCover = useCallback(
    async (noteId: string) => {
      const existing = notes.find((n) => n.id === noteId)
      if (existing?.cover_storage_path) {
        await deleteNoteCover(existing.cover_storage_path)
      }
      return updateNote(noteId, {
        cover_image_url: null,
        cover_storage_path: null,
      })
    },
    [notes, updateNote],
  )

  return {
    notes,
    pagesByNoteId,
    loading,
    error,
    refetch: fetchNotes,
    refreshPagesForNote,
    bumpNoteInList,
    createNote,
    updateNote,
    deleteNote,
    uploadCover,
    removeCover,
  }
}
