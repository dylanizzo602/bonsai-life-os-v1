/* TaskNameHover component: Displays task name with tooltip when truncated */
import { TruncatedText } from '../../components/TruncatedText'
import type { TaskStatus } from './types'

interface TaskNameHoverProps {
  /** Task title to display */
  title: string
  /** Task status (affects styling - completed shows line-through) */
  status: TaskStatus
  /** Maximum width in pixels for the task name (calculated from available space) */
  maxWidth?: number
  /** Position of tooltip relative to text */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** Additional CSS classes */
  className?: string
}

/**
 * Component that displays a task name with a tooltip showing the full name when truncated.
 * Handles task-specific styling (completed state with line-through, color variations).
 * Truncates text based on available width (maxWidth prop) to ensure all icons remain visible.
 */
export function TaskNameHover({
  title,
  status,
  maxWidth,
  tooltipPosition = 'top',
  className = '',
}: TaskNameHoverProps) {

  /* Base classes: Responsive text sizing, truncation, and layout */
  const baseClasses = 'min-w-0 truncate text-left text-sm font-medium md:text-base'
  
  /* Status-specific classes: Completed tasks have line-through and muted color */
  const statusClasses =
    status === 'completed'
      ? 'text-bonsai-slate-500 line-through'
      : 'text-bonsai-brown-700'

  /* Combined classes: Base + status + any additional classes */
  const combinedClasses = `${baseClasses} ${statusClasses} ${className}`.trim()

  /* Render: Use TruncatedText to show tooltip when name is truncated */
  /* Only set maxWidth style if maxWidth prop is provided and positive */
  return (
    <TruncatedText
      fullText={title}
      tooltipPosition={tooltipPosition}
      className={combinedClasses}
      style={maxWidth && maxWidth > 0 ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      {title}
    </TruncatedText>
  )
}
