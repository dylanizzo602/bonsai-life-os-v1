/* TimeEstimateTooltip: Hover tooltip for time estimate icons with task estimate and total with subtasks */

import type { ReactNode } from 'react'
import { Tooltip } from '../../../components/Tooltip'

/** Format minutes as readable string (e.g. "5m", "1h 30m", "2h") */
function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === 0) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

export interface TimeEstimateTooltipProps {
  /** Task time estimate in minutes */
  minutes: number | null
  /** Total with subtasks in minutes (optional; when not provided, uses minutes for both lines) */
  totalWithSubtasks?: number | null
  /** Trigger element (e.g. time estimate button or icon) */
  children: ReactNode
  /** Tooltip position relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Tooltip for time estimate icons: shows "Time Estimate" with pill value and "Total with subtasks - X".
 * Light rounded container; first line has label + gray pill, second line has total.
 */
export function TimeEstimateTooltip({
  minutes,
  totalWithSubtasks,
  children,
  position = 'top',
}: TimeEstimateTooltipProps) {
  const formattedEstimate = formatMinutes(minutes)
  const total = totalWithSubtasks != null ? totalWithSubtasks : minutes
  const formattedTotal = formatMinutes(total)

  /* Don't show tooltip when there's no estimate to display */
  if (formattedEstimate === '' && formattedTotal === '') {
    return <>{children}</>
  }

  /* Content: First line = label + gray pill; second line = total with subtasks */
  const content = (
    <div>
      {/* First line: Time Estimate label + gray pill with value */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-bonsai-slate-700">Time Estimate</span>
        <span className="rounded-full bg-bonsai-slate-200 px-2.5 py-0.5 text-sm font-medium text-bonsai-slate-800">
          {formattedEstimate || '—'}
        </span>
      </div>
      {/* Second line: Total with subtasks */}
      <div className="mt-1.5 text-sm text-bonsai-slate-700">
        Total with subtasks – {formattedTotal || '—'}
      </div>
    </div>
  )

  return (
    <Tooltip content={content} position={position} size="sm">
      {children}
    </Tooltip>
  )
}
