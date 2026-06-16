/* AttachmentListItem: Task attachment chip with preview and three-dot options menu */

import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import type { TaskAttachment } from '../../types'
import {
  attachmentExtensionLabel,
  downloadAttachment,
  isImageAttachment,
  openAttachment,
} from '../../utils/attachmentActions'

export interface AttachmentListItemProps {
  attachment: TaskAttachment
  /** Open the full-screen attachment preview gallery */
  onPreview: () => void
  /** Remove this attachment from the task */
  onDelete: () => void
}

interface MenuItemProps {
  icon: string
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

/** Single row in the attachment options dropdown */
function AttachmentMenuItem({ icon, label, onClick, variant = 'default' }: MenuItemProps) {
  const isDanger = variant === 'danger'

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-secondary transition-colors ${
        isDanger
          ? 'text-error hover:bg-error-container/30'
          : 'text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <MaterialIcon
        name={icon}
        className={`text-[18px] shrink-0 ${isDanger ? 'text-error' : 'text-on-surface-variant'}`}
      />
      <span className={isDanger ? 'font-medium' : ''}>{label}</span>
    </button>
  )
}

/**
 * Attachment chip shown in task/subtask edit modals: click the chip to preview,
 * or use the ⋮ menu to open, download, or delete.
 */
export function AttachmentListItem({ attachment, onPreview, onDelete }: AttachmentListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const fileName = attachment.name ?? 'Attachment'
  const isImage = isImageAttachment(attachment)

  /* Close menu on outside click or Escape */
  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const handleOpen = () => {
    openAttachment(attachment)
    closeMenu()
  }

  const handleDownload = () => {
    downloadAttachment(attachment)
    closeMenu()
  }

  const handleDelete = () => {
    onDelete()
    closeMenu()
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex items-stretch rounded-lg border border-outline-variant/40 bg-surface-container-lowest overflow-visible"
    >
      {/* Main chip: opens preview gallery */}
      <button
        type="button"
        onClick={onPreview}
        className="flex items-center gap-2 px-3 py-2 text-secondary hover:bg-surface-container-low transition-colors min-w-0"
        title={`Preview: ${fileName}`}
      >
        {isImage ? (
          <img src={attachment.url} alt={fileName} className="w-8 h-8 object-cover rounded shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant text-xs font-medium shrink-0">
            {attachmentExtensionLabel(fileName)}
          </div>
        )}
        <span className="text-on-surface truncate max-w-[160px] md:max-w-[200px]">{fileName}</span>
      </button>

      {/* Three-dot menu trigger */}
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center justify-center px-2 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-l border-outline-variant/30 transition-colors"
        aria-label={`Options for ${fileName}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <MaterialIcon name="more_vert" className="text-[20px]" />
      </button>

      {/* Options dropdown: open, download, delete */}
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[120] mt-1 min-w-[180px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-lg py-1 overflow-hidden"
        >
          <AttachmentMenuItem icon="open_in_new" label="Open" onClick={handleOpen} />
          <AttachmentMenuItem icon="download" label="Download" onClick={handleDownload} />
          <div className="my-1 border-t border-outline-variant/20" />
          <AttachmentMenuItem icon="delete" label="Delete" onClick={handleDelete} variant="danger" />
        </div>
      )}
    </div>
  )
}
