/* DependencyTooltip component: Tooltip that displays task dependency counts (blocking and blocked by) */
import React, { type ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { WarningIcon, BlockedIcon } from './icons'

interface DependencyTooltipProps {
  /** Number of tasks this task is blocking */
  blockingCount: number
  /** Number of tasks blocking this task */
  blockedByCount: number
  /** Element that triggers the tooltip on hover (typically an icon) */
  children: ReactNode
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Tooltip component that displays task dependency counts.
 * Shows "Blocking X tasks" with a warning icon and "Blocked by X tasks" with a blocked icon.
 * Only displays if at least one count is greater than 0.
 */
export function DependencyTooltip({
  blockingCount,
  blockedByCount,
  children,
  position = 'top',
}: DependencyTooltipProps) {
  /* Format task count text: Singular vs plural */
  const formatTaskCount = (count: number) => {
    return count === 1 ? 'task' : 'tasks'
  }

  /* Check if we have any content to show */
  const hasContent = blockingCount > 0 || blockedByCount > 0

  /* Build content array: Collect non-empty lines */
  const contentLines: React.ReactNode[] = []
  
  if (blockingCount > 0) {
    contentLines.push(
      <div key="blocking" className="flex items-center gap-2 mb-1.5">
        <WarningIcon className="w-4 h-4 text-bonsai-slate-800 shrink-0" />
        <span>Blocking {blockingCount} {formatTaskCount(blockingCount)}</span>
      </div>
    )
  }
  
  if (blockedByCount > 0) {
    contentLines.push(
      <div key="blocked" className="flex items-center gap-2">
        <BlockedIcon className="w-4 h-4 text-red-500 shrink-0" />
        <span>Blocked by {blockedByCount} {formatTaskCount(blockedByCount)}</span>
      </div>
    )
  }

  /* Tooltip content: Two lines showing blocking and blocked by counts with icons */
  /* Only create content if we have at least one count > 0 */
  const tooltipContent = hasContent && contentLines.length > 0 ? (
    <div className="px-3 py-2 text-sm text-bonsai-slate-700">
      {contentLines}
    </div>
  ) : null

  /* Render: Only wrap with Tooltip if we have content, otherwise render children directly */
  if (!hasContent || contentLines.length === 0) {
    return <>{children}</>
  }

  return (
    <Tooltip content={tooltipContent} position={position}>
      {children}
    </Tooltip>
  )
}
