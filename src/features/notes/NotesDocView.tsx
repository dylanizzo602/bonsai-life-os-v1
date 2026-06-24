/* NotesDocView: Document view with page tabs sidebar and per-page rich text editor */
import { useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { MaterialIcon } from '../../components/MaterialIcon'
import { RichTextEditor, type RichTextEditorSaveStatus } from './RichTextEditor'
import { DocumentTabsSidebar } from './components/DocumentTabsSidebar'
import { NoteCoverUploadModal } from './components/NoteCoverUploadModal'
import { NoteDocumentHeader } from './components/NoteDocumentHeader'
import { formatLastEditedLabel } from '../reflections/utils/formatRelativeTime'
import { buildDraftFromPages } from './utils/noteTemplateData'
import type { Note, NoteFolder, NotePage, NotePageTreeNode } from './types'
import type { NoteTemplateDraft } from './utils/noteTemplateData'
interface NotesDocViewProps {
  /** Current note document */
  note: Note
  folders: NoteFolder[]
  pageTree: NotePageTreeNode[]
  pages: NotePage[]
  pagesLoading: boolean
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onAddTopLevelPage: () => Promise<string | null>
  onAddSubpage: (parentPageId: string) => Promise<string | null>
  onRenamePage: (pageId: string, title: string) => Promise<void>
  onDeletePage: (pageId: string) => Promise<void>
  onUpdatePage: (pageId: string, input: { title?: string; content?: string }) => Promise<unknown>
  onUpdateNote: (id: string, input: { title?: string }) => Promise<unknown>
  onBack: () => void
  onDeleteNote: (id: string) => Promise<void>
  onMoveToFolder: (noteId: string, folderId: string | null) => Promise<void>
  onUploadCover: (noteId: string, file: File) => Promise<unknown>
  onRemoveCover: (noteId: string) => Promise<unknown>
  pageError: string | null
  /** Open note templates modal from document view */
  onOpenTemplates?: () => void
  /** Parent reads current draft snapshot for template save */
  templateDraftGetterRef?: MutableRefObject<(() => NoteTemplateDraft) | null>
}

/**
 * Document view: hierarchical page tabs + editor for the selected page.
 */
export function NotesDocView({
  note,
  folders,
  pageTree,
  pages,
  pagesLoading,
  selectedPageId,
  onSelectPage,
  onAddTopLevelPage,
  onAddSubpage,
  onRenamePage,
  onDeletePage,
  onUpdatePage,
  onUpdateNote,
  onBack,
  onDeleteNote,
  onMoveToFolder,
  onUploadCover,
  onRemoveCover,
  pageError,
  onOpenTemplates,
  templateDraftGetterRef,
}: NotesDocViewProps) {
  const selectedPage = pages.find((p) => p.id === selectedPageId)
  const editorHtmlGetterRef = useRef<(() => string) | null>(null)

  /* Document title edit state */
  const [docTitle, setDocTitle] = useState(note.title)
  const [pageTitle, setPageTitle] = useState(selectedPage?.title ?? '')
  const [saveStatus, setSaveStatus] = useState<RichTextEditorSaveStatus>('saved')
  const [lastEditedMs, setLastEditedMs] = useState(() =>
    selectedPage ? new Date(selectedPage.updated_at).getTime() : Date.now(),
  )
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [localPageError, setLocalPageError] = useState<string | null>(null)

  const lastEditedLabel = useMemo(() => formatLastEditedLabel(lastEditedMs), [lastEditedMs])

  useEffect(() => {
    setDocTitle(note.title)
  }, [note.id, note.title])

  useEffect(() => {
    if (selectedPage) {
      setPageTitle(selectedPage.title)
      setLastEditedMs(new Date(selectedPage.updated_at).getTime())
      setSaveStatus('saved')
    }
  }, [selectedPage?.id, selectedPage?.title, selectedPage?.updated_at])

  /* Register draft getter so parent can snapshot unsaved editor state */
  useEffect(() => {
    if (!templateDraftGetterRef) return
    templateDraftGetterRef.current = () =>
      buildDraftFromPages(pages, {
        documentTitle: docTitle,
        selectedPageId,
        selectedPageTitle: pageTitle,
        selectedPageContent:
          editorHtmlGetterRef.current?.() ?? selectedPage?.content ?? '',
      })
    return () => {
      templateDraftGetterRef.current = null
    }
  }, [
    templateDraftGetterRef,
    pages,
    docTitle,
    selectedPageId,
    pageTitle,
    selectedPage?.content,
  ])

  /* Persist helper: show saving indicator then update last-edited timestamp */
  const persistPage = useCallback(
    async (input: { title?: string; content?: string }) => {
      if (!selectedPage) return
      setSaveStatus('saving')
      try {
        await onUpdatePage(selectedPage.id, input)
        setSaveStatus('saved')
        setLastEditedMs(Date.now())
      } catch {
        setSaveStatus('idle')
      }
    },
    [selectedPage, onUpdatePage],
  )

  const handleDocTitleBlur = useCallback(() => {
    if (docTitle === note.title) return
    void onUpdateNote(note.id, { title: docTitle.trim() || 'Untitled' })
  }, [docTitle, note.id, note.title, onUpdateNote])

  const handlePageTitleBlur = useCallback(() => {
    if (!selectedPage || pageTitle === selectedPage.title) return
    const trimmed = pageTitle.trim() || 'Untitled'
    void persistPage({ title: trimmed })
    /* Single-page notes: keep library title in sync with the page title */
    if (pages.length === 1 && trimmed !== note.title) {
      void onUpdateNote(note.id, { title: trimmed })
      setDocTitle(trimmed)
    }
  }, [selectedPage, pageTitle, persistPage, pages.length, note.id, note.title, onUpdateNote])

  const handleContentBlur = useCallback(
    (html: string) => {
      if (!selectedPage || html === selectedPage.content) return
      void persistPage({ content: html })
    },
    [selectedPage, persistPage],
  )

  const handleConfirmDelete = useCallback(async () => {
    await onDeleteNote(note.id)
    setDeleteModalOpen(false)
    onBack()
  }, [note.id, onDeleteNote, onBack])

  const handleDeletePage = useCallback(
    async (pageId: string) => {
      try {
        setLocalPageError(null)
        await onDeletePage(pageId)
      } catch (err) {
        setLocalPageError(err instanceof Error ? err.message : 'Failed to delete page')
      }
    },
    [onDeletePage],
  )

  const displayError = pageError || localPageError

  return (
    <div className="relative flex min-h-full flex-col lg:flex-row">
      <DocumentTabsSidebar
        pageTree={pageTree}
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={onSelectPage}
        onAddTopLevelPage={() => {
          void onAddTopLevelPage()
        }}
        onAddSubpage={(parentId) => {
          void onAddSubpage(parentId)
        }}
        onRenamePage={(pageId, title) => {
          void onRenamePage(pageId, title)
        }}
        onDeletePage={(pageId) => {
          void handleDeletePage(pageId)
        }}
      />

      <main className="min-w-0 flex-1 overflow-y-auto bg-surface-container-low/20">
        <div className="mx-auto flex w-full max-w-[850px] flex-col px-4 pb-24 md:px-8">
          {/* Back navigation */}
          <div className="mt-6 md:mt-8">
            <button
              type="button"
              onClick={onBack}
              className="group -ml-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-primary transition-colors hover:bg-primary-fixed/30"
            >
              <MaterialIcon name="arrow_back" className="text-lg" />
              <span className="text-sm font-semibold">Back to library</span>
            </button>
          </div>

          {/* Compact document header: cover, folder, notebook title */}
          <div className="mt-6">
            <NoteDocumentHeader
              note={note}
              folders={folders}
              showNotebookTitle={pages.length > 1}
              notebookTitle={docTitle}
              onNotebookTitleChange={setDocTitle}
              onNotebookTitleBlur={handleDocTitleBlur}
              onMoveToFolder={(folderId) => {
                void onMoveToFolder(note.id, folderId)
              }}
              onAddCover={() => setCoverModalOpen(true)}
              onChangeCover={() => setCoverModalOpen(true)}
              onRemoveCover={() => void onRemoveCover(note.id)}
            />
          </div>

          {displayError && (
            <p className="mt-4 text-secondary text-error" role="alert">
              {displayError}
            </p>
          )}

          {pagesLoading && (
            <p className="text-body text-on-surface-variant py-8">Loading pages…</p>
          )}

          {/* Page editor: same reflection-style editor as journal entries */}
          {!pagesLoading && selectedPage && (
            <div className="mt-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                {/* Last-edited metadata and delete action */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-outline">
                  <div className="flex items-center gap-1">
                    <MaterialIcon name="history" className="text-base" />
                    <span>{lastEditedLabel}</span>
                  </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenTemplates && (
                    <button
                      type="button"
                      onClick={onOpenTemplates}
                      className="flex items-center gap-1.5 rounded-lg bg-surface-variant/20 px-3 py-1.5 text-secondary font-medium text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <MaterialIcon name="content_copy" className="text-base" />
                      Templates
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-error transition-colors hover:bg-error-container/40"
                    aria-label="Delete note"
                  >
                    <MaterialIcon name="delete" className="text-base" />
                    <span className="text-secondary font-semibold">Delete</span>
                  </button>
                </div>
                </div>

                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  onBlur={handlePageTitleBlur}
                  spellCheck
                  className="w-full border-0 bg-transparent text-page-title font-semibold tracking-tight text-on-surface focus:outline-none focus:ring-0"
                  placeholder="Untitled"
                  aria-label="Page title"
                />
              </div>

              <RichTextEditor
                editorKey={selectedPage.id}
                value={selectedPage.content}
                onBlur={handleContentBlur}
                placeholder="Start writing…"
                variant="reflection"
                saveStatus={saveStatus}
                htmlGetterRef={editorHtmlGetterRef}
              />
            </div>
          )}

          {!pagesLoading && !selectedPage && pages.length > 0 && (
            <p className="mt-8 text-body text-on-surface-variant">Select a page to edit.</p>
          )}
        </div>
      </main>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete note?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-bonsai-slate-700">
          This will permanently delete &quot;{note.title || 'Untitled'}&quot; and all its pages.
        </p>
      </Modal>

      <NoteCoverUploadModal
        isOpen={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        noteTitle={note.title}
        currentCoverUrl={note.cover_image_url}
        onUpload={async (file) => {
          await onUploadCover(note.id, file)
          setCoverModalOpen(false)
        }}
      />
    </div>
  )
}
