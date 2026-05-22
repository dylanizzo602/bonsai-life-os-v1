/* BonsaiTaskStatusButton: Status circle for lineup/backlog rows (open / in progress / complete) */

import { MaterialIcon } from '../../../../components/MaterialIcon'
import { getTaskDisplayStatus, getTaskStatusAriaLabel } from '../../TaskStatusIndicator'
import type { TaskStatus } from '../../types'

interface BonsaiTaskStatusButtonProps {
  status: TaskStatus
  size?: 'sm' | 'md'
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
}

/**
 * Mock-aligned status control: open ring, in-progress yellow fill, complete primary + check.
 */
export function BonsaiTaskStatusButton({
  status,
  size = 'md',
  onClick,
  disabled = false,
}: BonsaiTaskStatusButtonProps) {
  const displayStatus = getTaskDisplayStatus(status)
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const checkSize = size === 'sm' ? 'text-[14px]' : 'text-[16px]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || displayStatus === 'complete'}
      className="flex shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-default"
      aria-label={
        displayStatus === 'complete'
          ? getTaskStatusAriaLabel(displayStatus)
          : 'Mark task complete'
      }
    >
      {displayStatus === 'complete' ? (
        <span
          className={`flex ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} items-center justify-center rounded-full bg-primary text-on-primary`}
        >
          <MaterialIcon name="check" className={checkSize} />
        </span>
      ) : displayStatus === 'in_progress' ? (
        <span
          className={`${dim} shrink-0 rounded-full bg-[#EAB308]`}
          title="In progress"
          aria-hidden
        />
      ) : (
        <span
          className={`${dim} shrink-0 rounded-full border-2 border-[#7D8C7C]`}
          title="Open"
          aria-hidden
        />
      )}
    </button>
  )
}
