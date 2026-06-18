/* DocumentTabMenu: Page actions — rename, add subpage, delete */
import { useState, useRef, useEffect } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import type { NotePage } from '../types'

interface DocumentTabMenuProps {
  page: NotePage
  isTopLevel: boolean
  onRename: (title: string) => void
  onAddSubpage?: () => void
  onDelete: () => void
}

/**
 * More menu for a document tab row.
 */
export function DocumentTabMenu({
  page,
  isTopLevel,
  onRename,
  onAddSubpage,
  onDelete,
}: DocumentTabMenuProps) {
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(page.title)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    setRenameValue(page.title)
  }, [page.title])

  const handleRenameSave = () => {
    onRename(renameValue.trim() || 'Untitled')
    setRenameOpen(false)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="rounded-full p-1 text-on-surface-variant/50 transition-colors hover:text-primary"
        aria-label="Page options"
        aria-expanded={open}
      >
        <MaterialIcon name="more_vert" className="text-[18px]" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
            onClick={() => {
              setRenameOpen(true)
              setOpen(false)
            }}
          >
            Rename
          </button>
          {isTopLevel && onAddSubpage && (
            <button
              type="button"
              className="flex w-full px-4 py-2 text-left text-secondary text-on-surface hover:bg-surface-container-low"
              onClick={() => {
                setOpen(false)
                onAddSubpage()
              }}
            >
              Add subpage
            </button>
          )}
          <div className="my-1 border-t border-outline-variant/20" />
          <button
            type="button"
            className="flex w-full px-4 py-2 text-left text-secondary text-error hover:bg-error-container/30"
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
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename page"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRenameSave}>
              Save
            </Button>
          </div>
        }
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="Page title"
          autoFocus
        />
      </Modal>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete page?"
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
          Delete &quot;{page.title || 'Untitled'}&quot;?
          {isTopLevel ? ' Its subpages will also be deleted.' : ''}
        </p>
      </Modal>
    </div>
  )
}
