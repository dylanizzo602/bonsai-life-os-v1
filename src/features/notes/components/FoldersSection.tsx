/* FoldersSection: Folders grid with View All and create affordance */
import { useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { FolderCard } from './FolderCard'
import { FoldersViewAllModal } from './FoldersViewAllModal'
import { CreateEditFolderModal } from './CreateEditFolderModal'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import type { NoteFolder } from '../types'

const PREVIEW_FOLDER_COUNT = 4

interface FoldersSectionProps {
  folders: NoteFolder[]
  noteCountByFolderId: Record<string, number>
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onCreateFolder: (input: { name: string; icon_name: string }) => Promise<unknown>
  onUpdateFolder: (id: string, input: { name: string; icon_name: string }) => Promise<unknown>
  onDeleteFolder: (id: string) => Promise<void>
}

/**
 * Folders section for the notes library with preview grid and view-all modal.
 */
export function FoldersSection({
  folders,
  noteCountByFolderId,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}: FoldersSectionProps) {
  const [viewAllOpen, setViewAllOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null)
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null)

  const previewFolders = folders.slice(0, PREVIEW_FOLDER_COUNT)
  const folderToDelete = deleteFolderId ? folders.find((f) => f.id === deleteFolderId) : null

  /* Open create folder modal */
  const handleOpenCreate = () => {
    setEditingFolder(null)
    setFolderModalOpen(true)
  }

  /* Open edit folder modal */
  const handleEditFolder = (folder: NoteFolder) => {
    setEditingFolder(folder)
    setFolderModalOpen(true)
  }

  /* Save folder from create/edit modal */
  const handleSaveFolder = async (input: { name: string; icon_name: string }) => {
    if (editingFolder) {
      await onUpdateFolder(editingFolder.id, input)
    } else {
      await onCreateFolder(input)
    }
  }

  /* Confirm folder delete */
  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderId) return
    await onDeleteFolder(deleteFolderId)
    if (selectedFolderId === deleteFolderId) {
      onSelectFolder(null)
    }
    setDeleteFolderId(null)
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-semibold font-headline text-on-surface">Folders</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="text-secondary font-bold text-primary hover:underline"
          >
            New folder
          </button>
          {folders.length > 0 && (
            <button
              type="button"
              onClick={() => setViewAllOpen(true)}
              className="text-secondary font-bold text-primary hover:underline"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {folders.length === 0 ? (
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low p-8 text-secondary text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-surface-container"
        >
          <MaterialIcon name="create_new_folder" />
          Create your first folder
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {previewFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              noteCount={noteCountByFolderId[folder.id] ?? 0}
              onClick={() =>
                onSelectFolder(selectedFolderId === folder.id ? null : folder.id)
              }
            />
          ))}
        </div>
      )}

      <FoldersViewAllModal
        isOpen={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        folders={folders}
        noteCountByFolderId={noteCountByFolderId}
        onFolderClick={onSelectFolder}
        onCreateFolder={handleOpenCreate}
        onEditFolder={handleEditFolder}
        onDeleteFolder={setDeleteFolderId}
      />

      <CreateEditFolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        folder={editingFolder}
        onSave={handleSaveFolder}
      />

      <Modal
        isOpen={Boolean(deleteFolderId)}
        onClose={() => setDeleteFolderId(null)}
        title="Delete folder?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteFolderId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteFolder}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-on-surface-variant">
          Delete &quot;{folderToDelete?.name}&quot;? Notes in this folder will become uncategorized.
        </p>
      </Modal>
    </section>
  )
}
