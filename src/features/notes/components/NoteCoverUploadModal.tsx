/* NoteCoverUploadModal: Upload or replace a note cover image */
import { useState, useRef } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { MaterialIcon } from '../../../components/MaterialIcon'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface NoteCoverUploadModalProps {
  isOpen: boolean
  onClose: () => void
  noteTitle: string
  currentCoverUrl?: string | null
  onUpload: (file: File) => Promise<void>
}

/**
 * Modal for selecting and uploading a note cover image.
 */
export function NoteCoverUploadModal({
  isOpen,
  onClose,
  noteTitle,
  currentCoverUrl,
  onUpload,
}: NoteCoverUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* Reset state when modal closes */
  const handleClose = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setError(null)
    onClose()
  }

  /* Handle file selection with validation */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Please choose a JPEG, PNG, WebP, or GIF image.')
      return
    }

    if (preview) URL.revokeObjectURL(preview)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setError(null)
  }

  /* Upload selected file */
  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image first.')
      return
    }
    try {
      setUploading(true)
      setError(null)
      await onUpload(file)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const displayPreview = preview ?? currentCoverUrl ?? null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Note cover"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-secondary text-on-surface-variant">
        Set a cover image for &quot;{noteTitle || 'Untitled'}&quot;.
      </p>

      {displayPreview ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-outline-variant/20">
          <img src={displayPreview} alt="" className="h-40 w-full object-cover" />
        </div>
      ) : (
        <div className="mb-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low">
          <MaterialIcon name="image" className="text-[32px] text-outline" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
        Choose image
      </Button>

      {error && (
        <p className="mt-3 text-secondary text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
