/* NotesLibraryView: Material-style notes library with folders, search, and grid/list */
import { useMemo, useState } from 'react'
import { NotesIcon } from '../../components/icons'
import { NotesLibraryHeader } from './components/NotesLibraryHeader'
import { NewNoteSplitButton } from './components/NewNoteSplitButton'
import { FoldersSection } from './components/FoldersSection'
import { RecentNotesSection } from './components/RecentNotesSection'
import { NoteCoverUploadModal } from './components/NoteCoverUploadModal'
import { filterNotes } from './utils/noteDisplay'
import type { Note, NoteFolder, NotePage, NotesViewMode } from './types'

interface NotesLibraryViewProps {
  notes: Note[]
  pagesByNoteId: Record<string, NotePage[]>
  folders: NoteFolder[]
  noteCountByFolderId: Record<string, number>
  loading: boolean
  foldersLoading: boolean
  error: string | null
  search: string
  onSearchChange: (value: string) => void
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  viewMode: NotesViewMode
  onViewModeChange: (mode: NotesViewMode) => void
  onNewNote: () => void
  onCreateFromTemplate: () => void
  onNoteClick: (id: string) => void
  onCreateFolder: (input: { name: string; icon_name: string }) => Promise<unknown>
  onUpdateFolder: (id: string, input: { name: string; icon_name: string }) => Promise<unknown>
  onDeleteFolder: (id: string) => Promise<void>
  onMoveToFolder: (noteId: string, folderId: string | null) => Promise<unknown>
  onUploadCover: (noteId: string, file: File) => Promise<unknown>
  onRemoveCover: (noteId: string) => Promise<unknown>
  onDeleteNote: (id: string) => Promise<void>
}

/**
 * Notes Library page: header, folders, and recent notes in grid or list view.
 */
export function NotesLibraryView({
  notes,
  pagesByNoteId,
  folders,
  noteCountByFolderId,
  loading,
  foldersLoading,
  error,
  search,
  onSearchChange,
  selectedFolderId,
  onSelectFolder,
  viewMode,
  onViewModeChange,
  onNewNote,
  onCreateFromTemplate,
  onNoteClick,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveToFolder,
  onUploadCover,
  onRemoveCover,
  onDeleteNote,
}: NotesLibraryViewProps) {
  const [coverNoteId, setCoverNoteId] = useState<string | null>(null)

  /* Filter notes by search and selected folder */
  const filteredNotes = useMemo(
    () => filterNotes(notes, { search, folderId: selectedFolderId, pagesByNoteId }),
    [notes, search, selectedFolderId, pagesByNoteId],
  )

  const selectedFolderName =
    selectedFolderId != null
      ? folders.find((f) => f.id === selectedFolderId)?.name ?? null
      : null

  const coverNote = coverNoteId ? notes.find((n) => n.id === coverNoteId) : null

  const isLoading = loading || foldersLoading
  const hasNoNotes = !isLoading && !error && notes.length === 0

  return (
    <div className="min-h-full w-full max-w-[1200px] mx-auto pb-16 md:pb-24">
      <NotesLibraryHeader
        search={search}
        onSearchChange={onSearchChange}
        onNewNote={onNewNote}
        onCreateFromTemplate={onCreateFromTemplate}
      />

      {error && (
        <p className="mb-4 text-body text-error" role="alert">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="text-body py-8 text-on-surface-variant">Loading notes…</p>
      )}

      {/* Empty state when user has no notes at all */}
      {hasNoNotes && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                <NotesIcon className="h-7 w-7 text-outline" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-body font-semibold text-on-surface">
              No notes yet
            </h2>
            <p className="mt-2 text-center text-secondary text-on-surface-variant">
              Create your first note to start building your library.
            </p>
            <div className="mt-8 flex justify-center">
              <NewNoteSplitButton
                size="empty"
                onNewNote={onNewNote}
                onCreateFromTemplate={onCreateFromTemplate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Library content when notes exist */}
      {!isLoading && notes.length > 0 && (
        <div className="space-y-16">
          <FoldersSection
            folders={folders}
            noteCountByFolderId={noteCountByFolderId}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onCreateFolder={onCreateFolder}
            onUpdateFolder={onUpdateFolder}
            onDeleteFolder={onDeleteFolder}
          />

          <RecentNotesSection
            notes={filteredNotes}
            folders={folders}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            selectedFolderId={selectedFolderId}
            selectedFolderName={selectedFolderName}
            onClearFolderFilter={() => onSelectFolder(null)}
            onOpenNote={onNoteClick}
            onMoveToFolder={onMoveToFolder}
            onSetCover={setCoverNoteId}
            onRemoveCover={(noteId) => void onRemoveCover(noteId)}
            onDeleteNote={onDeleteNote}
            pagesByNoteId={pagesByNoteId}
          />
        </div>
      )}

      {/* Cover upload modal */}
      {coverNote && (
        <NoteCoverUploadModal
          isOpen={Boolean(coverNoteId)}
          onClose={() => setCoverNoteId(null)}
          noteTitle={coverNote.title}
          currentCoverUrl={coverNote.cover_image_url}
          onUpload={async (file) => {
            await onUploadCover(coverNote.id, file)
            setCoverNoteId(null)
          }}
        />
      )}
    </div>
  )
}
