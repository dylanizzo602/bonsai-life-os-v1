/* RecentNotesSection: Recent notes with grid/list toggle */
import { MaterialIcon } from '../../../components/MaterialIcon'
import { NoteCard } from './NoteCard'
import { NoteListRow } from './NoteListRow'
import type { Note, NoteFolder, NotePage, NotesViewMode } from '../types'

interface RecentNotesSectionProps {
  notes: Note[]
  folders: NoteFolder[]
  viewMode: NotesViewMode
  onViewModeChange: (mode: NotesViewMode) => void
  selectedFolderId: string | null
  selectedFolderName: string | null
  onClearFolderFilter: () => void
  onOpenNote: (id: string) => void
  onMoveToFolder: (noteId: string, folderId: string | null) => void
  onSetCover: (noteId: string) => void
  onRemoveCover: (noteId: string) => void
  onDeleteNote: (id: string) => void
  pagesByNoteId: Record<string, NotePage[]>
}

/**
 * Recent notes section with folder breadcrumb, view toggle, and grid or list layout.
 */
export function RecentNotesSection({
  notes,
  folders,
  viewMode,
  onViewModeChange,
  selectedFolderId,
  selectedFolderName,
  onClearFolderFilter,
  onOpenNote,
  onMoveToFolder,
  onSetCover,
  onRemoveCover,
  onDeleteNote,
  pagesByNoteId,
}: RecentNotesSectionProps) {
  return (
    <section className="space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-body font-semibold font-headline text-on-surface">Recent Notes</h2>
          {selectedFolderId && selectedFolderName && (
            <button
              type="button"
              onClick={onClearFolderFilter}
              className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-secondary text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <MaterialIcon name="folder" className="text-[16px]" />
              {selectedFolderName}
              <MaterialIcon name="close" className="text-[16px]" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === 'grid' ? 'text-primary' : 'text-outline hover:text-primary'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <MaterialIcon name="grid_view" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === 'list' ? 'text-primary' : 'text-outline hover:text-primary'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <MaterialIcon name="format_list_bulleted" />
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low p-8">
          <p className="text-center text-body text-on-surface-variant">
            {selectedFolderId ? 'No notes in this folder yet.' : 'No notes yet. Create your first note.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              pages={pagesByNoteId[note.id]}
              folders={folders}
              onOpen={() => onOpenNote(note.id)}
              onMoveToFolder={(folderId) => onMoveToFolder(note.id, folderId)}
              onSetCover={() => onSetCover(note.id)}
              onRemoveCover={() => onRemoveCover(note.id)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <NoteListRow
              key={note.id}
              note={note}
              pages={pagesByNoteId[note.id]}
              folders={folders}
              onOpen={() => onOpenNote(note.id)}
              onMoveToFolder={(folderId) => onMoveToFolder(note.id, folderId)}
              onSetCover={() => onSetCover(note.id)}
              onRemoveCover={() => onRemoveCover(note.id)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
