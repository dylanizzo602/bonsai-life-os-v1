/* AttachmentUploadModal: Upload and manage task attachments (edit mode only) */

import { useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { uploadTaskAttachment } from '../../../lib/supabase/storage'
import type { TaskAttachment } from '../types'

export interface AttachmentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  existingAttachments: TaskAttachment[]
  onUploadComplete: (attachments: TaskAttachment[]) => void
}

export function AttachmentUploadModal({
  isOpen,
  onClose,
  taskId,
  existingAttachments,
  onUploadComplete,
}: AttachmentUploadModalProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const attachment = await uploadTaskAttachment(taskId, file)
      onUploadComplete([...existingAttachments, attachment])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = (url: string) => {
    onUploadComplete(existingAttachments.filter((a) => a.url !== url))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attachments"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Choose file'}
        </Button>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {existingAttachments.length > 0 && (
          <ul className="space-y-2">
            {existingAttachments.map((a) => (
              <li
                key={a.url}
                className="flex items-center justify-between rounded-lg border border-bonsai-slate-200 px-3 py-2 text-sm"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bonsai-sage-600 hover:underline truncate flex-1 min-w-0"
                >
                  {a.name ?? 'Attachment'}
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(a.url)}
                  className="shrink-0 text-bonsai-slate-500 hover:text-red-600"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
