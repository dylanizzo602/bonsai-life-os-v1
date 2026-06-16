/* Attachment actions: Open, download, and display helpers for task attachments */

import type { TaskAttachment } from '../types'

/** True when the attachment can be shown as an inline image thumbnail. */
export function isImageAttachment(attachment: TaskAttachment): boolean {
  return attachment.type?.startsWith('image/') ?? false
}

/** Short extension label for non-image attachment chips. */
export function attachmentExtensionLabel(fileName: string): string {
  return fileName.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'FILE'
}

/** Open the attachment URL in a new browser tab. */
export function openAttachment(attachment: TaskAttachment): void {
  window.open(attachment.url, '_blank', 'noopener,noreferrer')
}

/** Trigger a browser download for the attachment file. */
export function downloadAttachment(attachment: TaskAttachment): void {
  const link = document.createElement('a')
  link.href = attachment.url
  link.download = attachment.name ?? 'attachment'
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.click()
}
