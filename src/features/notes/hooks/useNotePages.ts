/* useNotePages hook: Pages for one note document + CRUD */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getPagesForNote,
  createNotePage as createNotePageApi,
  updateNotePage as updateNotePageApi,
  deleteNotePage as deleteNotePageApi,
  countTopLevelPages,
} from '../../../lib/supabase/notePages'
import type { NotePage, UpdateNotePageInput } from '../types'
import {
  buildPageTree,
  getDefaultPageTitle,
  getDefaultSubpageTitle,
  canAddSubpage,
} from '../utils/pageTree'

interface UseNotePagesOptions {
  noteId: string | null
  onNoteUpdated?: (noteId: string) => void
}

/**
 * Manages pages for a single open note document.
 */
export function useNotePages({ noteId, onNoteUpdated }: UseNotePagesOptions) {
  const [pages, setPages] = useState<NotePage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pageTree = useMemo(() => buildPageTree(pages), [pages])

  /* Fetch pages when noteId changes */
  const fetchPages = useCallback(async () => {
    if (!noteId) {
      setPages([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await getPagesForNote(noteId)
      setPages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pages')
      console.error('Error fetching note pages:', err)
    } finally {
      setLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    void fetchPages()
  }, [fetchPages])

  /* Create top-level page */
  const createTopLevelPage = useCallback(async () => {
    if (!noteId) throw new Error('No note selected')
    const topLevelCount = pages.filter((p) => p.parent_page_id === null).length
    const page = await createNotePageApi({
      note_id: noteId,
      title: getDefaultPageTitle(topLevelCount),
    })
    setPages((prev) => [...prev, page])
    onNoteUpdated?.(noteId)
    return page
  }, [noteId, pages, onNoteUpdated])

  /* Create subpage under a top-level page */
  const createSubpage = useCallback(
    async (parentPageId: string) => {
      if (!noteId) throw new Error('No note selected')
      if (!canAddSubpage(parentPageId, pages)) {
        throw new Error('Cannot add subpage here')
      }
      const subCount = pages.filter((p) => p.parent_page_id === parentPageId).length
      const page = await createNotePageApi({
        note_id: noteId,
        parent_page_id: parentPageId,
        title: getDefaultSubpageTitle(subCount),
      })
      setPages((prev) => [...prev, page])
      onNoteUpdated?.(noteId)
      return page
    },
    [noteId, pages, onNoteUpdated],
  )

  /* Update page fields */
  const updatePage = useCallback(
    async (id: string, input: UpdateNotePageInput) => {
      const updated = await updateNotePageApi(id, input)
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)))
      if (noteId) onNoteUpdated?.(noteId)
      return updated
    },
    [noteId, onNoteUpdated],
  )

  /* Delete page; throws if last top-level page */
  const deletePage = useCallback(
    async (id: string) => {
      if (!noteId) throw new Error('No note selected')
      const page = pages.find((p) => p.id === id)
      if (!page) return

      if (page.parent_page_id === null) {
        const count = await countTopLevelPages(noteId)
        if (count <= 1) {
          throw new Error('Cannot delete the last page. Delete the note from the library instead.')
        }
      }

      await deleteNotePageApi(id)
      setPages((prev) => prev.filter((p) => p.id !== id && p.parent_page_id !== id))
      onNoteUpdated?.(noteId)
    },
    [noteId, pages, onNoteUpdated],
  )

  return {
    pages,
    pageTree,
    loading,
    error,
    refetch: fetchPages,
    createTopLevelPage,
    createSubpage,
    updatePage,
    deletePage,
  }
}
