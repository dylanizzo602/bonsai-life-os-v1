/* TaskStatusIndicator: Shared status circle (open / in progress / complete) for task rows */

import type { TaskStatus } from './types'

/** Display status for the status circle */
export type TaskDisplayStatus = 'open' | 'in_progress' | 'complete'

/** Map TaskStatus to display status for the status circle */
export function getTaskDisplayStatus(status: TaskStatus): TaskDisplayStatus {
  if (status === 'completed') return 'complete'
  if (status === 'in_progress') return 'in_progress'
  return 'open'
}

const STATUS_ARIA: Record<TaskDisplayStatus, string> = {
  open: 'Task open',
  in_progress: 'Task in progress',
  complete: 'Task completed',
}

export interface TaskStatusIndicatorProps {
  status: TaskDisplayStatus
  /** Circle diameter in pixels (default 20) */
  size?: number
}

/**
 * Status circle: OPEN = black dotted stroke, IN PROGRESS = yellow dashed + fill, COMPLETE = solid green.
 */
export function TaskStatusIndicator({ status, size = 20 }: TaskStatusIndicatorProps) {
  const r = (size - 4) / 2
  const cx = size / 2
  const cy = size / 2

  if (status === 'complete') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-green-500, #22c55e)"
          stroke="var(--color-green-600, #16a34a)"
          strokeWidth={2}
        />
      </svg>
    )
  }

  if (status === 'in_progress') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-yellow-400, #facc15)"
          stroke="var(--color-yellow-500, #eab308)"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      </svg>
    )
  }

  /* OPEN: black dotted stroke, no fill */
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="2 2"
        className="text-bonsai-slate-800"
      />
    </svg>
  )
}

/** Accessible label for a status circle button */
export function getTaskStatusAriaLabel(status: TaskDisplayStatus): string {
  return STATUS_ARIA[status]
}
