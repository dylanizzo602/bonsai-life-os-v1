/* NoteListRow: List row variant for a note in the library */
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { Note, NoteFolder, NotePage } from '../types'
import { getNotePreviewText, formatNoteEditedDate } from '../utils/noteDisplay'
import { NoteCardMenu } from './NoteCardMenu'

interface NoteListRowProps {
  note: Note
  pages?: NotePage[]
  folders: NoteFolder[]
  onOpen: () => void
  onMoveToFolder: (folderId: string | null) => void
  onSetCover: () => void
  onRemoveCover: () => void
  onDelete: () => void
}

/**
 * Compact list row for notes in list view mode.
 */
export function NoteListRow({
  note,
  pages,
  folders,
  onOpen,
  onMoveToFolder,
  onSetCover,
  onRemoveCover,
  onDelete,
}: NoteListRowProps) {
  const excerpt = getNotePreviewText(pages)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="flex cursor-pointer items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 transition-all hover:border-primary/20 hover:bg-surface-container-low md:p-5"
      aria-label={`Open note: ${note.title || 'Untitled'}`}
    >
      {note.cover_image_url ? (
        <img
          src={note.cover_image_url}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
          <MaterialIcon name="description" className="text-[24px] text-outline" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-body font-semibold text-on-surface">
          {note.title || 'Untitled'}
        </h4>
        {excerpt ? (
          <p className="mt-1 line-clamp-1 whitespace-pre-line text-secondary text-on-surface-variant">
            {excerpt}
          </p>
        ) : null}
      </div>
      <div className="hidden shrink-0 items-center gap-2 text-xs text-outline sm:flex">
        <MaterialIcon name="calendar_today" className="text-[16px]" />
        <span className="whitespace-nowrap">{formatNoteEditedDate(note.updated_at)}</span>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <NoteCardMenu
          note={note}
          folders={folders}
          onOpen={onOpen}
          onMoveToFolder={onMoveToFolder}
          onSetCover={onSetCover}
          onRemoveCover={onRemoveCover}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
