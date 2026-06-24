/* NoteDocumentHeader: Compact cover, folder, and notebook metadata above the page editor */

import { MaterialIcon } from '../../../components/MaterialIcon'
import type { Note, NoteFolder } from '../types'

interface NoteDocumentHeaderProps {
  note: Note
  folders: NoteFolder[]
  /** True when the note has more than one page (shows notebook title field) */
  showNotebookTitle: boolean
  notebookTitle: string
  onNotebookTitleChange: (value: string) => void
  onNotebookTitleBlur: () => void
  onMoveToFolder: (folderId: string | null) => void
  onAddCover: () => void
  onChangeCover: () => void
  onRemoveCover: () => void
}

/**
 * Compact document header: optional cover banner, folder chip, and notebook title when multi-page.
 */
export function NoteDocumentHeader({
  note,
  folders,
  showNotebookTitle,
  notebookTitle,
  onNotebookTitleChange,
  onNotebookTitleBlur,
  onMoveToFolder,
  onAddCover,
  onChangeCover,
  onRemoveCover,
}: NoteDocumentHeaderProps) {
  const selectedFolder = folders.find((f) => f.id === note.folder_id)

  return (
    <div className="flex flex-col gap-4">
      {/* Cover banner: only when a cover exists */}
      {note.cover_image_url ? (
        <div className="group relative -mx-4 overflow-hidden rounded-xl md:-mx-8">
          <img
            src={note.cover_image_url}
            alt=""
            className="h-28 w-full object-cover md:h-36"
          />
          <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-on-surface/30 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={onChangeCover}
              className="rounded-lg bg-surface-container-lowest/95 px-2.5 py-1 text-secondary font-medium text-on-surface shadow-sm backdrop-blur-sm"
            >
              Change
            </button>
            <button
              type="button"
              onClick={onRemoveCover}
              className="rounded-lg bg-surface-container-lowest/95 px-2.5 py-1 text-secondary font-medium text-error shadow-sm backdrop-blur-sm"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {/* Metadata chips: folder and optional add-cover */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container">
          <MaterialIcon
            name={selectedFolder?.icon_name ?? 'folder'}
            className="pointer-events-none text-base text-outline"
          />
          <select
            value={note.folder_id ?? ''}
            onChange={(e) => onMoveToFolder(e.target.value || null)}
            className="max-w-[10rem] cursor-pointer appearance-none border-0 bg-transparent pr-5 text-secondary text-on-surface focus:outline-none focus:ring-0"
            aria-label="Folder"
          >
            <option value="">Uncategorized</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <MaterialIcon
            name="expand_more"
            className="pointer-events-none absolute right-2 text-xs text-outline"
            aria-hidden
          />
        </label>

        {!note.cover_image_url ? (
          <button
            type="button"
            onClick={onAddCover}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <MaterialIcon name="image" className="text-base" />
            Add cover
          </button>
        ) : null}
      </div>

      {/* Notebook title: only shown for multi-page documents */}
      {showNotebookTitle ? (
        <input
          type="text"
          value={notebookTitle}
          onChange={(e) => onNotebookTitleChange(e.target.value)}
          onBlur={onNotebookTitleBlur}
          spellCheck
          className="w-full border-0 bg-transparent text-secondary font-medium text-on-surface-variant placeholder:text-outline-variant focus:outline-none focus:ring-0"
          placeholder="Notebook title"
          aria-label="Notebook title"
        />
      ) : null}
    </div>
  )
}
