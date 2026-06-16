/* AttachmentUploadModal: Drag-and-drop multi-file upload with per-file progress (edit mode) */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { uploadTaskAttachmentWithProgress } from '../../../lib/supabase/storage'
import type { TaskAttachment } from '../types'

/** Maximum attachment size shown in the UI (25MB). */
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

/** Queue item lifecycle for staged uploads. */
type QueueItemStatus = 'pending' | 'uploading' | 'completed' | 'error'

interface QueuedFile {
  id: string
  file: File
  previewUrl: string | null
  status: QueueItemStatus
  progress: number
  error: string | null
  attachment: TaskAttachment | null
}

export interface AttachmentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  existingAttachments: TaskAttachment[]
  onUploadComplete: (attachments: TaskAttachment[]) => void
}

/** True when the file is an image we can thumbnail in the queue list. */
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Upload and manage task attachments with drag-and-drop, queueing, and progress UI.
 */
export function AttachmentUploadModal({
  isOpen,
  onClose,
  taskId,
  existingAttachments,
  onUploadComplete,
}: AttachmentUploadModalProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const queueRef = useRef<QueuedFile[]>([])
  const existingAttachmentsRef = useRef(existingAttachments)
  const isProcessingRef = useRef(false)

  /* Keep refs in sync for async upload handlers */
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    existingAttachmentsRef.current = existingAttachments
  }, [existingAttachments])

  /* Reset queue and revoke object URLs when the modal closes */
  useEffect(() => {
    if (!isOpen) {
      setQueue((prev) => {
        prev.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
        })
        return []
      })
      abortControllersRef.current.forEach((controller) => controller.abort())
      abortControllersRef.current.clear()
      setIsDragging(false)
      setIsUploading(false)
      setGlobalError(null)
    }
  }, [isOpen])

  /* Revoke preview URLs on unmount */
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])

  /** Update a single queue item by id. */
  const updateQueueItem = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  /** Upload all pending queue items and persist each batch to the task */
  const processPendingUploads = useCallback(async () => {
    if (isProcessingRef.current) return

    isProcessingRef.current = true
    setIsUploading(true)
    setGlobalError(null)

    try {
      /* Loop so files added mid-upload are picked up in the next pass */
      while (true) {
        const pendingItems = queueRef.current.filter((item) => item.status === 'pending')
        if (pendingItems.length === 0) break

        const uploaded: TaskAttachment[] = []

        for (const item of pendingItems) {
          const controller = new AbortController()
          abortControllersRef.current.set(item.id, controller)

          updateQueueItem(item.id, { status: 'uploading', progress: 0, error: null })

          try {
            const attachment = await uploadTaskAttachmentWithProgress(taskId, item.file, {
              signal: controller.signal,
              onProgress: (percent) => {
                updateQueueItem(item.id, { progress: percent })
              },
            })

            uploaded.push(attachment)
            updateQueueItem(item.id, {
              status: 'completed',
              progress: 100,
              attachment,
            })
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              continue
            }

            const message = err instanceof Error ? err.message : 'Upload failed'
            updateQueueItem(item.id, { status: 'error', error: message })
            setGlobalError(message)
            console.error('Attachment upload error:', err)
          } finally {
            abortControllersRef.current.delete(item.id)
          }
        }

        if (uploaded.length > 0) {
          const merged = [...existingAttachmentsRef.current, ...uploaded]
          existingAttachmentsRef.current = merged
          onUploadComplete(merged)
        }
      }
    } finally {
      isProcessingRef.current = false
      setIsUploading(false)
    }
  }, [taskId, onUploadComplete, updateQueueItem])

  /** Stage files then start uploading immediately (matches pre-redesign behavior) */
  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const nextItems: QueuedFile[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name} exceeds the 25MB limit.`)
        return
      }

      nextItems.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
        status: 'pending',
        progress: 0,
        error: null,
        attachment: null,
      })
    })

    if (errors.length > 0) {
      setGlobalError(errors.join(' '))
    } else {
      setGlobalError(null)
    }

    if (nextItems.length > 0) {
      setQueue((prev) => {
        const next = [...prev, ...nextItems]
        queueRef.current = next
        return next
      })
      void processPendingUploads()
    }
  }, [processPendingUploads])

  /** File input change: add selected files to the queue */
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (files && files.length > 0) {
      addFilesToQueue(files)
    }
    event.target.value = ''
  }

  /** Drag-and-drop handlers for the drop zone */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files.length > 0) {
      addFilesToQueue(event.dataTransfer.files)
    }
  }

  /** Remove a queued file (pending/error) or abort an in-flight upload */
  const handleRemoveQueuedFile = (id: string) => {
    const controller = abortControllersRef.current.get(id)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(id)
    }

    setQueue((prev) => {
      const item = prev.find((entry) => entry.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((entry) => entry.id !== id)
    })
  }

  /** Retry failed uploads or upload any remaining pending files manually */
  const handleUploadAll = () => {
    setQueue((prev) => {
      const next = prev.map((item) =>
        item.status === 'error'
          ? { ...item, status: 'pending' as const, error: null, progress: 0 }
          : item,
      )
      queueRef.current = next
      return next
    })
    void processPendingUploads()
  }

  /** Close modal; if uploads finished, parent already has the latest attachments */
  const handleClose = () => {
    if (isUploading) return
    onClose()
  }

  const pendingCount = queue.filter((item) => item.status === 'pending' || item.status === 'error').length
  const activeCount = queue.length
  const allCompleted = activeCount > 0 && queue.every((item) => item.status === 'completed')
  const hasUploadableFiles = pendingCount > 0

  const primaryLabel = allCompleted
    ? 'Done'
    : hasUploadableFiles
      ? isUploading
        ? 'Uploading…'
        : `Retry upload${pendingCount === 1 ? '' : 's'}`
      : isUploading
        ? 'Uploading…'
        : 'Upload files'

  const modalHeader = (
    <div className="px-6 pt-6 pb-4 md:px-8 md:pt-8 flex justify-between items-center">
      <h2 className="text-body font-semibold text-on-surface">Upload Attachments</h2>
      <button
        type="button"
        onClick={handleClose}
        disabled={isUploading}
        className="text-on-surface-variant hover:text-on-surface transition-colors p-1 disabled:opacity-50"
        aria-label="Close"
      >
        <MaterialIcon name="close" className="text-[24px]" />
      </button>
    </div>
  )

  const modalFooter = (
    <div className="flex justify-end gap-3 items-center">
      <button
        type="button"
        onClick={handleClose}
        disabled={isUploading}
        className="px-6 py-2.5 rounded-lg border border-outline hover:bg-surface-container-low text-on-surface-variant font-medium text-secondary transition-all active:scale-95 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={allCompleted ? handleClose : handleUploadAll}
        disabled={isUploading || (!allCompleted && !hasUploadableFiles)}
        className="px-8 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-white font-semibold transition-all shadow-sm shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading…' : primaryLabel}
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={modalHeader}
      footer={modalFooter}
      overlayClassName="backdrop-blur-[12px] bg-black/15"
      cardClassName="bg-surface w-full max-w-[500px] rounded-xl custom-shadow overflow-hidden flex flex-col border border-outline-variant/30"
      headerClassName="p-0 border-0"
      bodyClassName="!px-6 !py-2 md:!px-8 max-h-[70vh] overflow-y-auto"
      footerClassName="!px-6 !py-6 mt-4 md:!px-8 md:!py-8 border-0"
    >
      <div className="space-y-8">
      {/* Drag-and-drop zone: browse or drop multiple files */}
      <div
        className={`relative group cursor-pointer ${isDragging ? 'ring-2 ring-primary/30 rounded-lg' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={`border-2 border-dashed rounded-lg p-8 md:p-10 flex flex-col items-center justify-center bg-surface-container-lowest gap-4 transition-all duration-300 ${
            isDragging ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant group-hover:border-primary'
          }`}
        >
          <div className="w-14 h-14 bg-primary-fixed rounded-full flex items-center justify-center text-primary">
            <MaterialIcon name="upload_file" className="text-[32px]" />
          </div>
          <div className="text-center">
            <p className="text-body font-medium text-on-surface">Drag &amp; drop files here</p>
            <p className="text-secondary text-on-surface-variant mt-1">Maximum file size: 25MB</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="mt-2 text-primary font-semibold hover:underline disabled:opacity-50"
          >
            Or browse files
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleFileInputChange}
          disabled={isUploading}
          aria-label="Choose files to upload"
        />
      </div>

      {globalError && (
        <p className="text-secondary text-error" role="alert">
          {globalError}
        </p>
      )}

      {/* Upload queue: pending, in-progress, completed, and error states */}
      {activeCount > 0 && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Uploading ({activeCount})
          </h3>
          <div className="space-y-3">
            {queue.map((item) => {
              const fileName = item.file.name
              const isImage = isImageFile(item.file)
              const isComplete = item.status === 'completed'
              const isError = item.status === 'error'
              const statusLabel = isComplete
                ? 'Completed'
                : isError
                  ? 'Failed'
                  : item.status === 'uploading'
                    ? `${item.progress}%`
                    : 'Pending'

              return (
                <div
                  key={item.id}
                  className={`bg-surface-container rounded-lg p-4 flex items-center gap-4 ${
                    isComplete ? 'border border-primary/20' : ''
                  }`}
                >
                  {/* Thumbnail or file-type icon */}
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-variant shrink-0 flex items-center justify-center">
                    {isImage && item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary-container">
                        <MaterialIcon name="description" className="text-secondary text-[20px]" />
                      </div>
                    )}
                  </div>

                  {/* File name and progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="text-secondary font-medium text-on-surface truncate">{fileName}</span>
                      <span
                        className={`text-[12px] shrink-0 ${
                          isComplete
                            ? 'text-primary font-medium'
                            : isError
                              ? 'text-error'
                              : 'text-on-surface-variant'
                        }`}
                      >
                        {isError ? item.error ?? 'Failed' : statusLabel}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-primary w-full' : isError ? 'bg-error w-full' : 'bg-primary'
                        }`}
                        style={{
                          width: isComplete || isError ? '100%' : `${Math.max(item.progress, item.status === 'pending' ? 0 : 8)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Remove / completed action */}
                  {isComplete ? (
                    <span className="text-primary" aria-hidden>
                      <MaterialIcon name="check_circle" className="text-[18px]" filled />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedFile(item.id)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                      aria-label={`Remove ${fileName}`}
                    >
                      <MaterialIcon name="cancel" className="text-[18px]" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </Modal>
  )
}
