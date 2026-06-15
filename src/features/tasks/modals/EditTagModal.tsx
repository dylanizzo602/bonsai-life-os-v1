/* EditTagModal: Dialog for renaming a tag, picking a color, previewing, and deleting */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { Tag } from '../types'
import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_OPTIONS,
  getTagSwatchClass,
  normalizeTagColor,
  type TagColorId,
} from '../utils/tagColors'

export interface EditTagModalProps {
  /** Whether the edit dialog is open */
  isOpen: boolean
  /** Tag being edited */
  tag: Tag | null
  /** Close without persisting draft changes */
  onClose: () => void
  /** Persist name/color updates */
  onSave: (tagId: string, updates: { name: string; color: TagColorId }) => Promise<void>
  /** Delete tag from all tasks */
  onDelete?: (tagId: string) => Promise<void>
}

export function EditTagModal({ isOpen, tag, onClose, onSave, onDelete }: EditTagModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<TagColorId>(DEFAULT_TAG_COLOR)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  /* Sync draft fields when a tag is opened for editing */
  useEffect(() => {
    if (!isOpen || !tag) return
    setName(tag.name)
    setColor(normalizeTagColor(tag.color))
  }, [isOpen, tag])

  if (!isOpen || !tag) return null

  const previewSwatch = getTagSwatchClass(color)
  const trimmedName = name.trim()
  const hasChanges =
    trimmedName !== tag.name || color !== normalizeTagColor(tag.color)

  /* Save handler: persist name and color, then close */
  const handleSave = async () => {
    if (!trimmedName || saving) return
    setSaving(true)
    try {
      await onSave(tag.id, { name: trimmedName, color })
      onClose()
    } catch (error) {
      console.error('Failed to save tag:', error)
    } finally {
      setSaving(false)
    }
  }

  /* Delete handler: remove tag everywhere when allowed */
  const handleDelete = async () => {
    if (!onDelete || deleting) return
    setDeleting(true)
    try {
      await onDelete(tag.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete tag:', error)
    } finally {
      setDeleting(false)
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      {/* Backdrop: dim layer behind the card */}
      <div className="absolute inset-0 bg-bonsai-slate-900/30" aria-hidden />

      {/* Card: edit tag form */}
      <div
        className="relative z-10 w-full max-w-xs overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl"
        role="dialog"
        aria-label="Edit tag"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header: title and close */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low p-4">
          <h2 className="text-sm font-semibold tracking-tight text-on-surface">Edit Tag</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-surface-container-high active:scale-95"
            aria-label="Close edit tag"
          >
            <MaterialIcon name="close" className="text-lg text-on-surface-variant" />
          </button>
        </div>

        {/* Body: name, color swatches, preview */}
        <div className="space-y-5 p-4">
          {/* Tag name input */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-tag-name"
              className="block text-[10px] font-bold uppercase tracking-widest text-outline/70"
            >
              Tag Name
            </label>
            <input
              id="edit-tag-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tag name..."
              className="w-full border-0 border-b border-outline-variant/30 bg-transparent px-0 py-1 text-sm font-medium text-on-surface transition-all placeholder:text-outline-variant focus:border-primary focus:ring-0"
            />
          </div>

          {/* Color swatch grid */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline/70">Color Theme</p>
            <div className="grid grid-cols-5 gap-2">
              {TAG_COLOR_OPTIONS.map((option) => {
                const isActive = color === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    title={option.label}
                    onClick={() => setColor(option.id)}
                    className={`aspect-square rounded transition-transform hover:scale-110 ${option.swatchClass} ${
                      isActive ? 'tag-swatch-active' : ''
                    }`}
                    aria-label={`Set color to ${option.label}`}
                    aria-pressed={isActive}
                  />
                )
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low/50 p-3">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${previewSwatch}`}
            >
              <MaterialIcon name="label" className="text-sm" filled />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-tight text-outline/70">Preview</p>
              <span className="block truncate text-xs font-medium text-on-surface">
                {trimmedName || tag.name}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: save and delete */}
        <div className="flex flex-col gap-2 border-t border-outline-variant/10 p-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!trimmedName || saving || (!hasChanges && !saving)}
            className="w-full rounded bg-primary py-2 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="flex w-full items-center justify-center gap-1.5 rounded py-2 text-[11px] font-bold uppercase tracking-widest text-error transition-all hover:bg-error-container/10 active:scale-[0.98] disabled:opacity-50"
            >
              <MaterialIcon name="delete" className="text-sm" />
              {deleting ? 'Deleting…' : 'Delete Tag'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
