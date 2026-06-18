/* NoteCardMenu: Popover actions for a note card or list row */
import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import type { Note, NoteFolder } from '../types'

interface NoteCardMenuProps {
  note: Note
  folders: NoteFolder[]
  onOpen: () => void
  onMoveToFolder: (folderId: string | null) => void
  onSetCover: () => void
  onRemoveCover: () => void
  onDelete: () => void
}

/**
 * More menu for note cards: open, move, cover actions, delete.
 */
export function NoteCardMenu({
  note,
  folders,
  onOpen,
  onMoveToFolder,
  onSetCover,
  onRemoveCover,
  onDelete,
}: NoteCardMenuProps) {
  const [open, setOpen] = useState(false)
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  /* Close menu on outside click */
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowFolderSubmenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const hasCover = Boolean(note.cover_image_url)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
          setShowFolderSubmenu(false)
        }}
        className="rounded-full p-1 text-outline transition-colors hover:text-primary"
        aria-label="Note options"
        aria-expanded={open}
      >
        <MaterialIcon name="more_vert" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
            onClick={() => {
              setOpen(false)
              onOpen()
            }}
          >
            Open
          </button>

          <div className="relative">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
              onClick={() => setShowFolderSubmenu((v) => !v)}
            >
              Move to folder
              <MaterialIcon name="chevron_right" className="text-[18px]" />
            </button>
            {showFolderSubmenu && (
              <div className="absolute left-full top-0 z-40 ml-1 min-w-[160px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-xl">
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
                  onClick={() => {
                    setOpen(false)
                    setShowFolderSubmenu(false)
                    onMoveToFolder(null)
                  }}
                >
                  Uncategorized
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="flex w-full px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
                    onClick={() => {
                      setOpen(false)
                      setShowFolderSubmenu(false)
                      onMoveToFolder(folder.id)
                    }}
                  >
                    {folder.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
            onClick={() => {
              setOpen(false)
              onSetCover()
            }}
          >
            {hasCover ? 'Change cover' : 'Set cover'}
          </button>

          {hasCover && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
              onClick={() => {
                setOpen(false)
                onRemoveCover()
              }}
            >
              Remove cover
            </button>
          )}

          <div className="my-1 border-t border-outline-variant/20" />

          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-secondary text-error hover:bg-error-container/30"
            onClick={() => {
              setOpen(false)
              setDeleteOpen(true)
            }}
          >
            Delete
          </button>
        </div>
      )}

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete note?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteOpen(false)
                onDelete()
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-on-surface-variant">
          This will permanently delete &quot;{note.title || 'Untitled'}&quot;. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
