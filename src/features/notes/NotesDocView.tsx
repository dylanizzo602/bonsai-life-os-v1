/* NotesDocView: Document view with page tabs sidebar and per-page rich text editor */
import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { MaterialIcon } from '../../components/MaterialIcon'
import { RichTextEditor } from './RichTextEditor'
import { DocumentTabsSidebar } from './components/DocumentTabsSidebar'
import { NoteCoverUploadModal } from './components/NoteCoverUploadModal'
import { ChevronLeftIcon } from '../../components/icons'
import type { Note, NoteFolder, NotePage, NotePageTreeNode } from './types'

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
}: NotesDocViewProps) {
  const selectedPage = pages.find((p) => p.id === selectedPageId)

  /* Document title edit state */
  const [docTitle, setDocTitle] = useState(note.title)
  const [pageTitle, setPageTitle] = useState(selectedPage?.title ?? '')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [localPageError, setLocalPageError] = useState<string | null>(null)

  useEffect(() => {
    setDocTitle(note.title)
  }, [note.id, note.title])

  useEffect(() => {
    if (selectedPage) setPageTitle(selectedPage.title)
  }, [selectedPage?.id, selectedPage?.title])

  const handleDocTitleBlur = useCallback(() => {
    if (docTitle === note.title) return
    void onUpdateNote(note.id, { title: docTitle.trim() || 'Untitled' })
  }, [docTitle, note.id, note.title, onUpdateNote])

  const handlePageTitleBlur = useCallback(() => {
    if (!selectedPage || pageTitle === selectedPage.title) return
    void onUpdatePage(selectedPage.id, { title: pageTitle.trim() || 'Untitled' })
  }, [selectedPage, pageTitle, onUpdatePage])

  const handleContentBlur = useCallback(
    (html: string) => {
      if (!selectedPage || html === selectedPage.content) return
      void onUpdatePage(selectedPage.id, { content: html })
    },
    [selectedPage, onUpdatePage],
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

  const formatLastUpdated = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

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

      <main className="min-w-0 flex-1 p-4 pb-28 md:p-6 lg:pb-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-1">
          <ChevronLeftIcon className="mr-1 h-5 w-5" />
          Back to library
        </Button>

        {/* Document title (library name) */}
        <input
          type="text"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          onBlur={handleDocTitleBlur}
          spellCheck
          className="mb-4 w-full border-0 bg-transparent text-secondary font-semibold text-on-surface-variant focus:outline-none focus:ring-0"
          placeholder="Document title"
          aria-label="Document title"
        />

        {note.cover_image_url ? (
          <div className="relative mb-6 overflow-hidden rounded-xl">
            <img src={note.cover_image_url} alt="" className="h-48 w-full object-cover" />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCoverModalOpen(true)}
                className="rounded-lg bg-surface-container-lowest/90 px-3 py-1.5 text-secondary font-medium text-on-surface shadow-sm"
              >
                Change cover
              </button>
              <button
                type="button"
                onClick={() => void onRemoveCover(note.id)}
                className="rounded-lg bg-surface-container-lowest/90 px-3 py-1.5 text-secondary font-medium text-error shadow-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCoverModalOpen(true)}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low py-4 text-secondary text-on-surface-variant hover:border-primary/30"
          >
            <MaterialIcon name="image" />
            Add cover image
          </button>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label htmlFor="note-folder" className="text-secondary text-on-surface-variant">
            Folder
          </label>
          <select
            id="note-folder"
            value={note.folder_id ?? ''}
            onChange={(e) => {
              void onMoveToFolder(note.id, e.target.value || null)
            }}
            className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5 text-secondary text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          >
            <option value="">Uncategorized</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {displayError && (
          <p className="mb-4 text-secondary text-error" role="alert">
            {displayError}
          </p>
        )}

        {pagesLoading && (
          <p className="text-body text-on-surface-variant py-8">Loading pages…</p>
        )}

        {!pagesLoading && selectedPage && (
          <>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              onBlur={handlePageTitleBlur}
              spellCheck
              className="mb-1 w-full border-0 bg-transparent text-page-title font-bold text-bonsai-brown-700 focus:outline-none focus:ring-0"
              placeholder="Untitled"
              aria-label="Page title"
            />
            <p className="text-secondary text-bonsai-slate-500 mb-4">
              Last updated {formatLastUpdated(selectedPage.updated_at)}
            </p>
            <RichTextEditor
              editorKey={selectedPage.id}
              value={selectedPage.content}
              onBlur={handleContentBlur}
              placeholder="Start writing…"
            />
          </>
        )}

        {!pagesLoading && !selectedPage && pages.length > 0 && (
          <p className="text-body text-on-surface-variant">Select a page to edit.</p>
        )}

        <div className="mt-6">
          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
            Delete note
          </Button>
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
