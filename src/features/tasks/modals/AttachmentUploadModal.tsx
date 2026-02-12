/* AttachmentUploadModal: Upload and manage task attachments (edit mode only) */

import { useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { AttachmentPreviewModal } from './AttachmentPreviewModal'
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
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null)
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
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      console.error('Attachment upload error:', err)
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Existing attachments: displayed to the left of the button */}
          {existingAttachments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {existingAttachments.map((a) => {
                const isImage = a.type?.startsWith('image/') ?? false
                const fileName = a.name ?? 'Attachment'
                return (
                  <button
                    key={a.url}
                    type="button"
                    onClick={() => setPreviewAttachment(a)}
                    className="flex items-center gap-2 rounded-lg border border-bonsai-slate-200 px-3 py-2 text-sm hover:bg-bonsai-slate-50 hover:border-bonsai-slate-300 transition-colors group"
                    title={`Click to preview: ${fileName}`}
                  >
                    {isImage ? (
                      <img
                        src={a.url}
                        alt={fileName}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-bonsai-slate-100 flex items-center justify-center text-bonsai-slate-500 text-xs font-medium">
                        {fileName.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'FILE'}
                      </div>
                    )}
                    <span className="text-bonsai-slate-700 group-hover:text-bonsai-sage-600 truncate max-w-[120px]">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(a.url)
                      }}
                      className="text-bonsai-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove attachment"
                    >
                      ×
                    </button>
                  </button>
                )
              })}
            </div>
          )}
          {/* Add attachment button */}
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Add attachment'}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
      {/* Preview modal */}
      <AttachmentPreviewModal
        isOpen={previewAttachment !== null}
        onClose={() => setPreviewAttachment(null)}
        attachment={previewAttachment}
      />
    </Modal>
  )
}
