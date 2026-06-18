/* Notes page: Library/detail container with hierarchical pages per document */
import { useState, useCallback, useEffect } from 'react'
import { consumeQuickAddIntent } from '../layout/quickAddIntent'
import { useNotes } from './hooks/useNotes'
import { useNoteFolders } from './hooks/useNoteFolders'
import { useNotePages } from './hooks/useNotePages'
import { NotesLibraryView } from './NotesLibraryView'
import { NotesDocView } from './NotesDocView'
import { getPersistedViewMode, persistViewMode } from './utils/noteDisplay'
import { getDefaultSelectedPageId, getPageIdAfterDelete } from './utils/pageTree'
import type { NotesViewMode } from './types'

/**
 * Notes page: library view or document view with page tabs.
 */
export function NotesPage() {
  const {
    notes,
    pagesByNoteId,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    uploadCover,
    removeCover,
    refreshPagesForNote,
  } = useNotes()
  const {
    folders,
    loading: foldersLoading,
    noteCountByFolderId,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useNoteFolders(notes)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<NotesViewMode>(getPersistedViewMode)

  const handleNoteUpdated = useCallback(
    (noteId: string) => {
      void refreshPagesForNote(noteId)
    },
    [refreshPagesForNote],
  )

  const {
    pages,
    pageTree,
    loading: pagesLoading,
    error: pagesError,
    createTopLevelPage,
    createSubpage,
    updatePage,
    deletePage,
  } = useNotePages({
    noteId: selectedNoteId,
    onNoteUpdated: handleNoteUpdated,
  })

  /* Default selected page when pages load */
  useEffect(() => {
    if (!selectedNoteId || pagesLoading || pages.length === 0) return
    if (selectedPageId && pages.some((p) => p.id === selectedPageId)) return
    setSelectedPageId(getDefaultSelectedPageId(pages))
  }, [selectedNoteId, pages, pagesLoading, selectedPageId])

  const handleViewModeChange = useCallback((mode: NotesViewMode) => {
    setViewMode(mode)
    persistViewMode(mode)
  }, [])

  const handleNewNote = useCallback(async () => {
    try {
      const newNote = await createNote({ folder_id: selectedFolderId ?? undefined })
      setSelectedNoteId(newNote.id)
      const notePages = pagesByNoteId[newNote.id]
      setSelectedPageId(getDefaultSelectedPageId(notePages ?? []) ?? null)
    } catch {
      /* Error in hook */
    }
  }, [createNote, selectedFolderId, pagesByNoteId])

  useEffect(() => {
    if (consumeQuickAddIntent() === 'note') void handleNewNote()
  }, [handleNewNote])

  const handleNoteClick = useCallback((id: string) => {
    setSelectedNoteId(id)
    const notePages = pagesByNoteId[id]
    setSelectedPageId(getDefaultSelectedPageId(notePages ?? []) ?? null)
  }, [pagesByNoteId])

  const handleBack = useCallback(() => {
    setSelectedNoteId(null)
    setSelectedPageId(null)
  }, [])

  const handleAddTopLevelPage = useCallback(async (): Promise<string | null> => {
    try {
      const page = await createTopLevelPage()
      setSelectedPageId(page.id)
      return page.id
    } catch {
      return null
    }
  }, [createTopLevelPage])

  const handleAddSubpage = useCallback(
    async (parentPageId: string): Promise<string | null> => {
      try {
        const page = await createSubpage(parentPageId)
        setSelectedPageId(page.id)
        return page.id
      } catch {
        return null
      }
    },
    [createSubpage],
  )

  const handleRenamePage = useCallback(
    async (pageId: string, title: string) => {
      await updatePage(pageId, { title })
    },
    [updatePage],
  )

  const handleDeletePage = useCallback(
    async (pageId: string) => {
      const nextId = getPageIdAfterDelete(pageId, pages)
      await deletePage(pageId)
      setSelectedPageId((current) => (current === pageId ? nextId : current))
    },
    [deletePage, pages],
  )

  const handleMoveToFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      await updateNote(noteId, { folder_id: folderId })
    },
    [updateNote],
  )

  const handleDeleteNote = useCallback(
    async (id: string) => {
      await deleteNote(id)
      if (selectedNoteId === id) {
        setSelectedNoteId(null)
        setSelectedPageId(null)
      }
    },
    [deleteNote, selectedNoteId],
  )

  const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null

  if (selectedNoteId && selectedNote) {
    return (
      <NotesDocView
        note={selectedNote}
        folders={folders}
        pageTree={pageTree}
        pages={pages}
        pagesLoading={pagesLoading}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onAddTopLevelPage={handleAddTopLevelPage}
        onAddSubpage={handleAddSubpage}
        onRenamePage={handleRenamePage}
        onDeletePage={handleDeletePage}
        onUpdatePage={updatePage}
        onUpdateNote={updateNote}
        onBack={handleBack}
        onDeleteNote={deleteNote}
        onMoveToFolder={handleMoveToFolder}
        onUploadCover={uploadCover}
        onRemoveCover={removeCover}
        pageError={pagesError}
      />
    )
  }

  return (
    <NotesLibraryView
      notes={notes}
      pagesByNoteId={pagesByNoteId}
      folders={folders}
      noteCountByFolderId={noteCountByFolderId}
      loading={loading}
      foldersLoading={foldersLoading}
      error={error}
      search={search}
      onSearchChange={setSearch}
      selectedFolderId={selectedFolderId}
      onSelectFolder={setSelectedFolderId}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      onNewNote={handleNewNote}
      onNoteClick={handleNoteClick}
      onCreateFolder={createFolder}
      onUpdateFolder={updateFolder}
      onDeleteFolder={deleteFolder}
      onMoveToFolder={handleMoveToFolder}
      onUploadCover={uploadCover}
      onRemoveCover={removeCover}
      onDeleteNote={handleDeleteNote}
    />
  )
}
