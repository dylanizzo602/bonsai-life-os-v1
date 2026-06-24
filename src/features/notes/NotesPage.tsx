/* Notes page: Library/detail container with hierarchical pages per document */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { consumeQuickAddIntent } from '../layout/quickAddIntent'
import { peekSearchOpenIntent, clearSearchOpenIntent } from '../search/searchOpenIntent'
import { useNotes } from './hooks/useNotes'
import { useNoteFolders } from './hooks/useNoteFolders'
import { useNotePages } from './hooks/useNotePages'
import { useNoteTemplates } from './hooks/useNoteTemplates'
import { NotesLibraryView } from './NotesLibraryView'
import { NotesDocView } from './NotesDocView'
import { NoteTemplatesModal } from './modals/NoteTemplatesModal'
import { getPersistedViewMode, persistViewMode } from './utils/noteDisplay'
import { getDefaultSelectedPageId, getPageIdAfterDelete } from './utils/pageTree'
import { buildDraftFromPages, isNoteEmptyForTemplateApply } from './utils/noteTemplateData'
import type { NoteTemplateData, NotesViewMode } from './types'
import type { NoteTemplateDraft, NoteTemplateIncludedFields } from './utils/noteTemplateData'

type TemplatesModalMode = 'libraryApply' | 'docSave'

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

  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    fetchTemplates,
    saveTemplateFromDraft,
    overwriteTemplateFromDraft,
    removeTemplate,
    applyTemplateToNote,
  } = useNoteTemplates()

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<NotesViewMode>(getPersistedViewMode)

  /* Templates modal state */
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false)
  const [templatesModalMode, setTemplatesModalMode] =
    useState<TemplatesModalMode>('libraryApply')
  const [templatesModalInitialTab, setTemplatesModalInitialTab] = useState<
    'library' | 'saveCurrent'
  >('library')
  const templateDraftGetterRef = useRef<(() => NoteTemplateDraft) | null>(null)

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

  const openTemplatesModal = useCallback(
    (mode: TemplatesModalMode, tab: 'library' | 'saveCurrent' = 'library') => {
      setTemplatesModalMode(mode)
      setTemplatesModalInitialTab(tab)
      setTemplatesModalOpen(true)
      void fetchTemplates()
    },
    [fetchTemplates],
  )

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

  const handleCreateFromTemplate = useCallback(() => {
    openTemplatesModal('libraryApply', 'library')
  }, [openTemplatesModal])

  const handleOpenDocTemplates = useCallback(() => {
    openTemplatesModal('docSave', 'saveCurrent')
  }, [openTemplatesModal])

  useEffect(() => {
    if (consumeQuickAddIntent() === 'note') void handleNewNote()
  }, [handleNewNote])

  /* Global search: open note or filter folder from search result */
  useEffect(() => {
    const intent = peekSearchOpenIntent()
    if (!intent) return

    if (intent.kind === 'note_folder') {
      clearSearchOpenIntent()
      const frame = requestAnimationFrame(() => {
        setSelectedFolderId(intent.id)
        setSelectedNoteId(null)
        setSelectedPageId(null)
      })
      return () => cancelAnimationFrame(frame)
    }

    if (intent.kind === 'note') {
      if (loading) return
      const noteExists = notes.some((n) => n.id === intent.id)
      if (!noteExists) {
        clearSearchOpenIntent()
        return
      }

      clearSearchOpenIntent()
      const notePages = pagesByNoteId[intent.id]
      const pageId = intent.pageId ?? getDefaultSelectedPageId(notePages ?? []) ?? null
      const frame = requestAnimationFrame(() => {
        setSelectedNoteId(intent.id)
        setSelectedPageId(pageId)
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [notes, pagesByNoteId, loading])

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

  const templateDraft = useMemo((): NoteTemplateDraft => {
    if (selectedNote && pages.length > 0) {
      return buildDraftFromPages(pages, {
        documentTitle: selectedNote.title,
        selectedPageId,
      })
    }
    return { documentTitle: '', pages: [] }
  }, [selectedNote, pages, selectedPageId])

  const canApplyTemplateInDoc =
    selectedNote != null && isNoteEmptyForTemplateApply(selectedNote, pages)

  const getCurrentTemplateDraft = useCallback((): NoteTemplateDraft => {
    return templateDraftGetterRef.current?.() ?? templateDraft
  }, [templateDraft])

  const handleApplyTemplate = useCallback(
    async (data: NoteTemplateData) => {
      try {
        if (templatesModalMode === 'libraryApply') {
          const newNote = await createNote({ folder_id: selectedFolderId ?? undefined })
          const firstPageId = await applyTemplateToNote(newNote.id, data)
          await refreshPagesForNote(newNote.id)
          setSelectedNoteId(newNote.id)
          setSelectedPageId(firstPageId)
          setTemplatesModalOpen(false)
          return
        }

        if (!selectedNoteId) return
        const firstPageId = await applyTemplateToNote(selectedNoteId, data)
        await refreshPagesForNote(selectedNoteId)
        setSelectedPageId(firstPageId)
        setTemplatesModalOpen(false)
      } catch {
        /* Error surfaced in hook */
      }
    },
    [
      templatesModalMode,
      createNote,
      selectedFolderId,
      applyTemplateToNote,
      refreshPagesForNote,
      selectedNoteId,
    ],
  )

  const handleCreateTemplate = useCallback(
    async (args: { name: string; icon: string | null; included: NoteTemplateIncludedFields }) => {
      await saveTemplateFromDraft({
        name: args.name,
        icon: args.icon,
        included: args.included,
        draft: getCurrentTemplateDraft(),
      })
    },
    [getCurrentTemplateDraft, saveTemplateFromDraft],
  )

  const handleOverwriteTemplate = useCallback(
    async (args: {
      id: string
      name?: string
      icon?: string | null
      included: NoteTemplateIncludedFields
    }) => {
      await overwriteTemplateFromDraft({
        id: args.id,
        name: args.name,
        icon: args.icon,
        included: args.included,
        draft: getCurrentTemplateDraft(),
      })
    },
    [getCurrentTemplateDraft, overwriteTemplateFromDraft],
  )

  const templatesModal = (
    <NoteTemplatesModal
      isOpen={templatesModalOpen}
      onClose={() => setTemplatesModalOpen(false)}
      mode={templatesModalMode}
      initialTab={templatesModalInitialTab}
      canApply={templatesModalMode === 'libraryApply' || canApplyTemplateInDoc}
      templates={templates}
      templatesLoading={templatesLoading}
      templatesError={templatesError}
      draft={templateDraft}
      onApplyTemplate={(data) => {
        void handleApplyTemplate(data)
      }}
      onDeleteTemplate={removeTemplate}
      onCreateTemplate={handleCreateTemplate}
      onOverwriteTemplate={handleOverwriteTemplate}
    />
  )

  if (selectedNoteId && selectedNote) {
    return (
      <>
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
          onOpenTemplates={handleOpenDocTemplates}
          templateDraftGetterRef={templateDraftGetterRef}
        />
        {templatesModal}
      </>
    )
  }

  return (
    <>
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
        onCreateFromTemplate={handleCreateFromTemplate}
        onNoteClick={handleNoteClick}
        onCreateFolder={createFolder}
        onUpdateFolder={updateFolder}
        onDeleteFolder={deleteFolder}
        onMoveToFolder={handleMoveToFolder}
        onUploadCover={uploadCover}
        onRemoveCover={removeCover}
        onDeleteNote={handleDeleteNote}
      />
      {templatesModal}
    </>
  )
}
