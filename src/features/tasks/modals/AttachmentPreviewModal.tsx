/* AttachmentPreviewModal: Immersive full-screen attachment preview with gallery navigation */

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { TaskAttachment } from '../types'

export interface AttachmentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  /** All task attachments available for gallery navigation */
  attachments: TaskAttachment[]
  /** Index of the attachment to show when the modal opens */
  initialIndex?: number
}

/** True when the attachment can be rendered as an inline image preview. */
function isImageAttachment(attachment: TaskAttachment): boolean {
  return attachment.type?.startsWith('image/') ?? false
}

/** Human-readable file size for the header metadata row. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Full-screen attachment preview with blurred backdrop, prev/next navigation,
 * thumbnail strip, download, open, print, and share actions.
 */
export function AttachmentPreviewModal({
  isOpen,
  onClose,
  attachments,
  initialIndex = 0,
}: AttachmentPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null)

  const attachmentCount = attachments.length
  const currentAttachment = attachmentCount > 0 ? attachments[currentIndex] ?? attachments[0] : null

  /* Sync index when the modal opens on a specific attachment */
  useEffect(() => {
    if (isOpen) {
      const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(attachmentCount - 1, 0))
      setCurrentIndex(safeIndex)
    }
  }, [isOpen, initialIndex, attachmentCount])

  /* Lock page scroll while the preview overlay is open */
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  /* Keyboard navigation: arrows to move, Escape to close */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (attachmentCount <= 1) return
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((index) => (index > 0 ? index - 1 : attachmentCount - 1))
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex((index) => (index < attachmentCount - 1 ? index + 1 : 0))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, attachmentCount])

  /* Fetch file size via HEAD when the current attachment changes */
  useEffect(() => {
    if (!isOpen || !currentAttachment?.url) {
      setFileSizeBytes(null)
      return
    }

    let cancelled = false
    setFileSizeBytes(null)

    fetch(currentAttachment.url, { method: 'HEAD' })
      .then((response) => {
        if (cancelled) return
        const length = response.headers.get('content-length')
        if (length) {
          const parsed = Number.parseInt(length, 10)
          if (!Number.isNaN(parsed)) setFileSizeBytes(parsed)
        }
      })
      .catch(() => {
        /* Size is optional metadata; ignore network errors */
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, currentAttachment?.url])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((index) => (index > 0 ? index - 1 : attachmentCount - 1))
  }, [attachmentCount])

  const goToNext = useCallback(() => {
    setCurrentIndex((index) => (index < attachmentCount - 1 ? index + 1 : 0))
  }, [attachmentCount])

  const openInNewTab = useCallback(() => {
    if (!currentAttachment) return
    window.open(currentAttachment.url, '_blank', 'noopener,noreferrer')
  }, [currentAttachment])

  const handleDownload = useCallback(() => {
    if (!currentAttachment) return
    const link = document.createElement('a')
    link.href = currentAttachment.url
    link.download = currentAttachment.name ?? 'attachment'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }, [currentAttachment])

  const handlePrint = useCallback(() => {
    if (!currentAttachment) return
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    const fileName = currentAttachment.name ?? 'Attachment'
    if (isImageAttachment(currentAttachment)) {
      printWindow.document.write(
        `<html><head><title>${fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${currentAttachment.url}" alt="${fileName}" style="max-width:100%;max-height:100vh;object-fit:contain;" onload="window.print();window.close();" /></body></html>`,
      )
    } else {
      printWindow.location.href = currentAttachment.url
    }
    printWindow.document.close()
  }, [currentAttachment])

  const handleShare = useCallback(async () => {
    if (!currentAttachment) return
    const fileName = currentAttachment.name ?? 'Attachment'

    try {
      if (navigator.share) {
        await navigator.share({ title: fileName, url: currentAttachment.url })
        return
      }
      await navigator.clipboard.writeText(currentAttachment.url)
    } catch {
      /* User cancelled share or clipboard failed */
    }
  }, [currentAttachment])

  if (!isOpen || !currentAttachment) return null

  const fileName = currentAttachment.name ?? 'Attachment'
  const isImage = isImageAttachment(currentAttachment)
  const canNavigate = attachmentCount > 1
  const backdropImageUrl = isImage ? currentAttachment.url : null

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-hidden" role="dialog" aria-modal="true" aria-label={`Preview ${fileName}`}>
      {/* Backdrop: blurred preview image with frosted overlay */}
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {backdropImageUrl ? (
          <img
            src={backdropImageUrl}
            alt=""
            className="w-full h-full object-cover scale-110 blur-3xl opacity-40"
          />
        ) : null}
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-[40px]" />
      </div>

      {/* Main overlay: centered preview card and thumbnail strip */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl h-[85vh] bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant/10">
          {/* Header: file metadata, open action, close */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex flex-col min-w-0">
                <h1 className="text-on-surface font-semibold text-body leading-tight truncate">{fileName}</h1>
                {fileSizeBytes != null && (
                  <span className="text-secondary text-on-surface-variant font-medium opacity-70">
                    {formatFileSize(fileSizeBytes)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={openInNewTab}
                className="ml-4 p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-2 shrink-0"
                title="Open in new tab"
              >
                <MaterialIcon name="open_in_new" className="text-[20px]" />
                <span className="text-xs font-bold font-label uppercase tracking-widest hidden sm:block">Open</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-all duration-300 group active:scale-90 shrink-0"
            >
              <MaterialIcon name="close" className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </header>

          {/* Content: image preview or non-image fallback with desktop nav arrows */}
          <section className="flex-grow flex items-center justify-center p-6 md:p-12 bg-surface-container-low/30 relative group min-h-0">
            {canNavigate && (
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-6 z-20 p-4 bg-surface-container-lowest/80 backdrop-blur shadow-sm rounded-full text-on-surface-variant hover:text-primary hover:shadow-md transition-all duration-200 active:scale-90 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center"
                aria-label="Previous attachment"
              >
                <MaterialIcon name="chevron_left" className="text-2xl" />
              </button>
            )}

            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
              {isImage ? (
                <img
                  src={currentAttachment.url}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain shadow-lg rounded"
                />
              ) : (
                <div className="text-center space-y-4 px-4">
                  <div className="mx-auto w-20 h-20 rounded-xl bg-secondary-container flex items-center justify-center">
                    <MaterialIcon name="description" className="text-secondary text-[40px]" />
                  </div>
                  <p className="text-body text-on-surface-variant">Preview not available for this file type.</p>
                  <button
                    type="button"
                    onClick={openInNewTab}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full font-semibold shadow-md hover:bg-primary-container transition-all active:scale-95"
                  >
                    <MaterialIcon name="open_in_new" className="text-[18px]" />
                    Open {fileName}
                  </button>
                </div>
              )}
            </div>

            {canNavigate && (
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-6 z-20 p-4 bg-surface-container-lowest/80 backdrop-blur shadow-sm rounded-full text-on-surface-variant hover:text-primary hover:shadow-md transition-all duration-200 active:scale-90 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center"
                aria-label="Next attachment"
              >
                <MaterialIcon name="chevron_right" className="text-2xl" />
              </button>
            )}
          </section>

          {/* Footer: position counter, download, print/share */}
          <footer className="relative px-6 py-6 border-t border-outline-variant/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {canNavigate && (
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors flex md:hidden"
                  aria-label="Previous attachment"
                >
                  <MaterialIcon name="arrow_back" />
                </button>
              )}
              <p className="text-secondary text-on-surface-variant font-medium">
                {canNavigate ? `Attachment ${currentIndex + 1} of ${attachmentCount}` : 'Attachment'}
              </p>
              {canNavigate && (
                <button
                  type="button"
                  onClick={goToNext}
                  className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors flex md:hidden"
                  aria-label="Next attachment"
                >
                  <MaterialIcon name="arrow_forward" />
                </button>
              )}
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full font-semibold shadow-md hover:bg-primary-container transition-all active:scale-95 duration-200"
              >
                <MaterialIcon name="download" className="text-[18px]" />
                <span>Download</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                title="Print"
                aria-label="Print attachment"
              >
                <MaterialIcon name="print" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                title="Share"
                aria-label="Share attachment"
              >
                <MaterialIcon name="share" />
              </button>
            </div>
          </footer>
        </div>

        {/* Thumbnail strip: quick jump between attachments */}
        {canNavigate && (
          <div className="mt-8 flex gap-3 overflow-x-auto max-w-full pb-4 px-4 scrollbar-hide">
            {attachments.map((item, index) => {
              const isActive = index === currentIndex
              const itemIsImage = isImageAttachment(item)
              const itemName = item.name ?? 'Attachment'

              return (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    isActive
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent opacity-100'
                      : 'opacity-50 hover:opacity-100 border border-outline-variant/30'
                  }`}
                  aria-label={`View attachment ${index + 1}: ${itemName}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {itemIsImage ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary-container flex items-center justify-center">
                      <MaterialIcon name="description" className="text-secondary text-[20px]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>,
    document.body,
  )
}
