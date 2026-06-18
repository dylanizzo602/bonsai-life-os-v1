/* FolderCard: Clickable folder tile with icon, note count, and name */
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { NoteFolder } from '../types'

interface FolderCardProps {
  folder: NoteFolder
  noteCount: number
  onClick: () => void
}

/**
 * Folder card for the notes library folders grid.
 */
export function FolderCard({ folder, noteCount, onClick }: FolderCardProps) {
  const countLabel = noteCount === 1 ? '1 Note' : `${noteCount} Notes`

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full cursor-pointer rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-left transition-all hover:border-primary/40"
      aria-label={`Open folder ${folder.name}, ${countLabel}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
          <MaterialIcon name={folder.icon_name || 'folder_open'} />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-outline">{countLabel}</span>
      </div>
      <h3 className="text-body font-medium font-headline text-on-surface">{folder.name}</h3>
    </button>
  )
}
