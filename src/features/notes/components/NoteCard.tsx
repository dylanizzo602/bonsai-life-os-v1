/* NoteCard: Grid card for a note in the library */
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { Note, NoteFolder, NotePage } from '../types'
import { getNotePreviewText, formatNoteEditedDate } from '../utils/noteDisplay'
import { NoteCardMenu } from './NoteCardMenu'

interface NoteCardProps {
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
 * Note card for the library grid view with optional cover image.
 */
export function NoteCard({
  note,
  pages,
  folders,
  onOpen,
  onMoveToFolder,
  onSetCover,
  onRemoveCover,
  onDelete,
}: NoteCardProps) {
  const excerpt = getNotePreviewText(pages)
  const hasCover = Boolean(note.cover_image_url)

  if (hasCover) {
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
        className="note-card-shadow flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest transition-all duration-300 hover:border-primary/20"
        aria-label={`Open note: ${note.title || 'Untitled'}`}
      >
        <img
          src={note.cover_image_url!}
          alt=""
          className="h-40 w-full object-cover"
        />
        <div className="flex flex-grow flex-col p-8">
          <h4 className="mb-3 text-body font-semibold font-headline text-on-surface">
            {note.title || 'Untitled'}
          </h4>
          {excerpt ? (
            <p className="line-clamp-2 whitespace-pre-line text-secondary text-on-surface-variant leading-relaxed">
              {excerpt}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between px-8 pb-6">
          <div className="flex items-center gap-2 text-xs text-outline">
            <MaterialIcon name="calendar_today" className="text-[16px]" />
            <span>{formatNoteEditedDate(note.updated_at)}</span>
          </div>
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
      className="note-card-shadow flex h-full cursor-pointer flex-col rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 transition-all duration-300 hover:border-primary/20"
      aria-label={`Open note: ${note.title || 'Untitled'}`}
    >
      <div className="flex-grow">
        <h4 className="mb-3 text-body font-semibold font-headline text-on-surface">
          {note.title || 'Untitled'}
        </h4>
        {excerpt ? (
          <p className="line-clamp-3 whitespace-pre-line text-secondary text-on-surface-variant leading-relaxed">
            {excerpt}
          </p>
        ) : null}
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-outline-variant/10 pt-4">
        <div className="flex items-center gap-2 text-xs text-outline">
          <MaterialIcon name="calendar_today" className="text-[16px]" />
          <span>{formatNoteEditedDate(note.updated_at)}</span>
        </div>
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
