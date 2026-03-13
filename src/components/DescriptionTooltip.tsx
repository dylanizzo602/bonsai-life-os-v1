/* DescriptionTooltip component: Tooltip that displays task description in a read-only box matching the modal style */
import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { descriptionToHtml } from '../features/tasks/utils/descriptionDisplay'

interface DescriptionTooltipProps {
  /** Description text to display in the tooltip */
  description: string
  /** Number of attachments linked to the task */
  attachmentCount?: number
  /** Element that triggers the tooltip on hover (typically an icon) */
  children: ReactNode
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/* Helper: Determine whether a description string has any visible text once HTML tags and non-breaking spaces are removed */
export function hasVisibleDescription(description: string | null | undefined): boolean {
  if (!description) return false
  return Boolean(description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim())
}

/**
 * Tooltip component that displays task description in a styled box matching the add/edit task modal.
 * The description is displayed in a read-only format with the same styling as the modal's description field.
 */
export function DescriptionTooltip({
  description,
  attachmentCount = 0,
  children,
  position = 'top',
}: DescriptionTooltipProps) {
  /* Attachment count text: Format based on count */
  const attachmentText = attachmentCount === 0 
    ? 'No attachments' 
    : attachmentCount === 1 
      ? '1 attachment' 
      : `${attachmentCount} attachments`

  /* Derived flags: Detect whether description has any visible text once HTML tags are stripped */
  const hasDescriptionText = hasVisibleDescription(description)

  /* Tooltip content: Styled box with description (links clickable, line breaks preserved) and attachment count at bottom */
  const isRichTextHtml = /<\/[a-z][^>]*>|<br\s*\/?>|<p[^>]*>/i.test(description)
  const descriptionHtml = hasDescriptionText
    ? isRichTextHtml
      ? description
      : descriptionToHtml(description)
    : ''
  const tooltipContent = (
    <div className="w-full min-w-[200px] max-w-[400px] px-3 py-2 text-sm text-bonsai-slate-700">
      {/* Description: Rendered HTML from rich text or plain text with links/newlines; hidden when empty */}
      {hasDescriptionText && (
        <div
          className="mb-2 break-words"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      )}
      {/* Attachment count: Shown at bottom with paperclip icon */}
      <div className="flex items-center gap-1.5 text-xs text-bonsai-slate-500 pt-2 border-t border-bonsai-slate-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <span>{attachmentText}</span>
      </div>
    </div>
  )

  /* Render: Wrap children with Tooltip, only show when there is description text or attachments */
  const hasContent = hasDescriptionText || attachmentCount > 0
  return (
    <Tooltip content={hasContent ? tooltipContent : ''} position={position}>
      {children}
    </Tooltip>
  )
}
