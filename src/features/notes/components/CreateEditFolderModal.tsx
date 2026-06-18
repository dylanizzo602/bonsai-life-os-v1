/* CreateEditFolderModal: Create or edit a note folder */
import { useState, useEffect } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { FolderIconPicker } from './FolderIconPicker'
import { DEFAULT_FOLDER_ICON } from '../utils/noteDisplay'
import type { NoteFolder } from '../types'

interface CreateEditFolderModalProps {
  isOpen: boolean
  onClose: () => void
  folder?: NoteFolder | null
  onSave: (input: { name: string; icon_name: string }) => Promise<void>
}

/**
 * Modal for creating or editing a note folder (name + icon).
 */
export function CreateEditFolderModal({
  isOpen,
  onClose,
  folder,
  onSave,
}: CreateEditFolderModalProps) {
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState(DEFAULT_FOLDER_ICON)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(folder)

  /* Reset form when modal opens or folder changes */
  useEffect(() => {
    if (!isOpen) return
    setName(folder?.name ?? '')
    setIconName(folder?.icon_name ?? DEFAULT_FOLDER_ICON)
    setError(null)
  }, [isOpen, folder])

  /* Submit: create or update folder */
  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Folder name is required.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await onSave({ name: trimmed, icon_name: iconName })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save folder')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void handleSave()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit folder' : 'New folder'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-4">
          <FolderIconPicker value={iconName} onChange={setIconName} />
          <div className="min-w-0 flex-1">
            <label htmlFor="folder-name" className="text-secondary font-medium text-on-surface-variant">
              Folder name
            </label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Strategic Planning"
              className="mt-1"
              autoFocus
            />
          </div>
        </div>
        {error && (
          <p className="text-secondary text-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
