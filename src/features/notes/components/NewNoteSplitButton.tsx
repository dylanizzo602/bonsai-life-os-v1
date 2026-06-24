/* NewNoteSplitButton: Primary New Note action with Create from template dropdown */
import { useEffect, useId, useRef, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'

interface NewNoteSplitButtonProps {
  onNewNote: () => void
  onCreateFromTemplate: () => void
  /** Optional size variant for empty-state vs header */
  size?: 'header' | 'empty'
}

/**
 * Split button: primary creates a blank note; dropdown opens template library apply flow.
 */
export function NewNoteSplitButton({
  onNewNote,
  onCreateFromTemplate,
  size = 'header',
}: NewNoteSplitButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const isHeader = size === 'header'
  const primaryClass = isHeader
    ? 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-l-lg bg-primary px-5 py-3 text-body font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95'
    : 'inline-flex items-center gap-2 rounded-l-xl bg-primary px-5 py-3 text-body font-semibold text-on-primary transition-colors hover:bg-primary-container'
  const chevronClass = isHeader
    ? 'inline-flex h-12 shrink-0 items-center justify-center rounded-r-lg border-l border-on-primary/20 bg-primary px-2.5 py-3 text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95'
    : 'inline-flex items-center justify-center rounded-r-xl border-l border-on-primary/20 bg-primary px-2.5 py-3 text-on-primary transition-colors hover:bg-primary-container'

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button type="button" onClick={onNewNote} className={primaryClass}>
        <MaterialIcon name="add" className="text-[20px]" />
        New Note
      </button>
      <button
        type="button"
        aria-label="More new note options"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className={chevronClass}
      >
        <MaterialIcon name="expand_more" className="text-[20px]" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[14rem] rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-body text-on-surface transition-colors hover:bg-surface-container"
            onClick={() => {
              setOpen(false)
              onCreateFromTemplate()
            }}
          >
            <MaterialIcon name="content_copy" className="text-base text-primary" />
            Create from template
          </button>
        </div>
      )}
    </div>
  )
}
