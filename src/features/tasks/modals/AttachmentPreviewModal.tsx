/* AttachmentPreviewModal: Preview attachment in a modal window */

import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import type { TaskAttachment } from '../types'

export interface AttachmentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  attachment: TaskAttachment | null
}

export function AttachmentPreviewModal({
  isOpen,
  onClose,
  attachment,
}: AttachmentPreviewModalProps) {
  if (!attachment) return null

  const isImage = attachment.type?.startsWith('image/') ?? false
  const fileName = attachment.name ?? 'Attachment'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              window.open(attachment.url, '_blank', 'noopener,noreferrer')
            }}
          >
            Open in new tab
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-center min-h-[200px]">
        {isImage ? (
          <img
            src={attachment.url}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        ) : (
          <div className="text-center space-y-4">
            <p className="text-bonsai-slate-600">Preview not available for this file type.</p>
            <Button
              variant="primary"
              onClick={() => {
                window.open(attachment.url, '_blank', 'noopener,noreferrer')
              }}
            >
              Open {fileName}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
