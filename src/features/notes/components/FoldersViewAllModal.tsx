/* FoldersViewAllModal: Full folder list with create/edit/delete */
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { FolderCard } from './FolderCard'
import type { NoteFolder } from '../types'

interface FoldersViewAllModalProps {
  isOpen: boolean
  onClose: () => void
  folders: NoteFolder[]
  noteCountByFolderId: Record<string, number>
  onFolderClick: (folderId: string) => void
  onCreateFolder: () => void
  onEditFolder: (folder: NoteFolder) => void
  onDeleteFolder: (folderId: string) => void
}

/**
 * Modal showing all folders with management actions.
 */
export function FoldersViewAllModal({
  isOpen,
  onClose,
  folders,
  noteCountByFolderId,
  onFolderClick,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: FoldersViewAllModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="All folders"
      footer={
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={onCreateFolder}>
            <MaterialIcon name="add" className="mr-1 text-[18px]" />
            New folder
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
      cardClassName="max-w-2xl"
    >
      {folders.length === 0 ? (
        <p className="text-body text-on-surface-variant">No folders yet. Create one to organize your notes.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {folders.map((folder) => (
            <div key={folder.id} className="relative">
              <FolderCard
                folder={folder}
                noteCount={noteCountByFolderId[folder.id] ?? 0}
                onClick={() => {
                  onFolderClick(folder.id)
                  onClose()
                }}
              />
              <div className="absolute right-3 top-3 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditFolder(folder)
                  }}
                  className="rounded-full bg-surface-container-lowest/90 p-1 text-outline hover:text-primary"
                  aria-label={`Edit folder ${folder.name}`}
                >
                  <MaterialIcon name="edit" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteFolder(folder.id)
                  }}
                  className="rounded-full bg-surface-container-lowest/90 p-1 text-outline hover:text-error"
                  aria-label={`Delete folder ${folder.name}`}
                >
                  <MaterialIcon name="delete" className="text-[18px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
