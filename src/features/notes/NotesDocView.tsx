/* NotesDocView: Document view with sidebar (note list) and main content (title, metadata, rich text body) */
import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { RichTextEditor } from './RichTextEditor'
import { ChevronLeftIcon, NotesIcon, PlusIcon } from '../../components/icons'
import type { Note } from './types'

interface NotesDocViewProps {
  /** All notes (for sidebar list) */
  notes: Note[]
  /** Currently open note id */
  selectedNoteId: string
  /** Return to list view (clear selection) */
  onBack: () => void
  /** Switch to another note by id */
  onSelectNote: (id: string) => void
  /** Create a new note and parent will open it (call then parent sets selectedNoteId) */
  onAddPage: () => void
  /** Update note title or content */
  onUpdateNote: (id: string, input: { title?: string; content?: string }) => Promise<unknown>
  /** Delete note (after delete parent should clear selection or switch) */
  onDeleteNote: (id: string) => Promise<void>
}

/**
 * Document view: sidebar with note list and "+ Add page", main area with title, last updated, and content.
 * Title and content save on blur.
 */
export function NotesDocView({
  notes,
  selectedNoteId,
  onBack,
  onSelectNote,
  onAddPage,
  onUpdateNote,
  onDeleteNote,
}: NotesDocViewProps) {
  const note = notes.find((n) => n.id === selectedNoteId)

  /* Local edit state: title; content comes from note and is saved by RichTextEditor on blur */
  const [title, setTitle] = useState(note?.title ?? '')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  /* Sync local title when note changes */
  useEffect(() => {
    if (note) setTitle(note.title)
  }, [note?.id, note?.title])

  /* Save title on blur */
  const handleTitleBlur = useCallback(() => {
    if (!note || title === note.title) return
    onUpdateNote(note.id, { title: title.trim() || 'Untitled' })
  }, [note, title, onUpdateNote])

  /* Save rich text content on blur (HTML from TipTap) */
  const handleContentBlur = useCallback(
    (html: string) => {
      if (!note || html === note.content) return
      onUpdateNote(note.id, { content: html })
    },
    [note, onUpdateNote],
  )

  /* Delete current note and go back to list */
  const handleConfirmDelete = useCallback(async () => {
    if (!note) return
    await onDeleteNote(note.id)
    setDeleteModalOpen(false)
    onBack()
  }, [note, onDeleteNote, onBack])

  /* Format last updated for display */
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

  /* Note not found: e.g. deleted elsewhere; show back only */
  if (!note) {
    return (
      <div className="min-h-full">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ChevronLeftIcon className="mr-1 h-5 w-5" />
          Back to list
        </Button>
        <p className="text-body text-bonsai-slate-600">Note not found.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* Sidebar: Note list and Add page (narrow on desktop, full width on mobile) */}
      <aside
        className="w-full border-b border-bonsai-slate-200 bg-bonsai-slate-50 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-r-bonsai-slate-200"
        aria-label="Pages"
      >
        <div className="p-3 lg:p-4">
          <h2 className="text-body font-semibold text-bonsai-brown-700 mb-3">Notes</h2>
          <nav className="flex flex-col gap-0.5" aria-label="Note list">
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNote(n.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-body transition-colors focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 ${
                  n.id === selectedNoteId
                    ? 'bg-bonsai-sage-100 text-bonsai-brown-700 font-medium'
                    : 'text-bonsai-slate-700 hover:bg-bonsai-slate-100'
                }`}
              >
                <NotesIcon className="h-5 w-5 shrink-0 text-bonsai-slate-500" />
                <span className="truncate">{n.title || 'Untitled'}</span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={onAddPage}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-secondary text-bonsai-slate-600 transition-colors hover:bg-bonsai-slate-100 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
          >
            <PlusIcon className="h-5 w-5 shrink-0" />
            Add page
          </button>
        </div>
      </aside>

      {/* Main content: Title, metadata, content textarea */}
      <main className="min-w-0 flex-1 p-4 md:p-6">
        {/* Back to list */}
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-1">
          <ChevronLeftIcon className="mr-1 h-5 w-5" />
          Back to list
        </Button>

        {/* Doc title: editable, saves on blur */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="mb-1 w-full border-0 bg-transparent text-page-title font-bold text-bonsai-brown-700 focus:outline-none focus:ring-0"
          placeholder="Untitled"
          aria-label="Note title"
        />

        {/* Metadata: Last updated */}
        <p className="text-secondary text-bonsai-slate-500 mb-4">
          Last updated {formatLastUpdated(note.updated_at)}
        </p>

        {/* Content: rich text editor, no box; saves on blur */}
        <RichTextEditor
          editorKey={note.id}
          value={note.content}
          onBlur={handleContentBlur}
          placeholder="Start writing…"
        />

        {/* Actions: Delete note */}
        <div className="mt-6">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            aria-label="Delete this note"
          >
            Delete note
          </Button>
        </div>
      </main>

      {/* Delete confirmation modal */}
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
          This will permanently delete &quot;{note.title || 'Untitled'}&quot;. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
