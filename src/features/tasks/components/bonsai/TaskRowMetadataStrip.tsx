/* TaskRowMetadataStrip: Icon metadata row (goal, description, subtasks, time, block, attach) */

import type { ReactNode } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import type { Task } from '../../types'
import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'
import {
  formatChecklistProgress,
  formatSubtaskProgress,
  formatTimeEstimateMinutes,
} from '../../utils/taskRowDisplay'

interface TaskRowMetadataStripProps {
  task: Task
  enrichment: TaskRowEnrichment
  /** Include checklist icon with count when present */
  showChecklistAsSubtasks?: boolean
  compact?: boolean
  /** Mobile lineup: show primary tag as trophy chip in metadata row */
  primaryTagName?: string | null
}

/**
 * Secondary metadata icons shared by lineup cards (and dense layouts).
 */
export function TaskRowMetadataStrip({
  task,
  enrichment,
  showChecklistAsSubtasks = false,
  compact = false,
  primaryTagName = null,
}: TaskRowMetadataStripProps) {
  const iconClass = compact ? 'text-[14px]' : 'text-[16px]'
  const textClass = compact
    ? 'text-[10px] font-medium text-outline/60'
    : 'text-[11px] font-medium text-outline/60'

  const totalMinutes =
    (task.time_estimate ?? 0) + (enrichment.subtaskTimeTotal ?? 0)
  const timeLabel =
    formatTimeEstimateMinutes(totalMinutes > 0 ? totalMinutes : task.time_estimate) ??
    formatTimeEstimateMinutes(task.time_estimate)

  const subtaskLabel = enrichment.hasSubtasks
    ? formatSubtaskProgress(
        enrichment.subtaskCount - enrichment.incompleteSubtaskCount,
        enrichment.subtaskCount,
      )
    : null

  const checklistLabel =
    enrichment.checklistSummary && showChecklistAsSubtasks
      ? formatChecklistProgress(
          enrichment.checklistSummary.completed,
          enrichment.checklistSummary.total,
        )
      : null

  const hasDescription = Boolean(task.description?.trim())
  const hasAttachments = (task.attachments?.length ?? 0) > 0
  const showBlocking = enrichment.isBlocking
  const showBlocked = enrichment.isBlocked

  const items: Array<{ key: string; node: ReactNode }> = []

  if (primaryTagName) {
    items.push({
      key: 'tag',
      node: (
        <span className={`flex items-center gap-1 ${textClass}`}>
          <MaterialIcon name="trophy" className={iconClass} />
          <span>{primaryTagName}</span>
        </span>
      ),
    })
  }

  if (task.goal_id) {
    items.push({
      key: 'goal',
      node: (
        <span className={`flex items-center gap-1 text-primary/70 ${textClass}`}>
          <MaterialIcon name="emoji_events" className={iconClass} />
          <span className="text-[10px] font-semibold">Linked to Goal</span>
        </span>
      ),
    })
  }

  if (hasDescription) {
    items.push({
      key: 'desc',
      node: (
        <span className={`flex items-center gap-1.5 ${textClass}`} title="Has description">
          <MaterialIcon name="description" className={iconClass} />
        </span>
      ),
    })
  }

  if (showBlocking) {
    items.push({
      key: 'blocking',
      node: (
        <span className={`flex items-center gap-1 font-semibold text-error ${textClass}`}>
          <MaterialIcon name="block" className={iconClass} />
          <span>Blocking</span>
        </span>
      ),
    })
  } else if (showBlocked) {
    items.push({
      key: 'blocked',
      node: (
        <span className={`flex items-center gap-1 font-semibold text-error ${textClass}`}>
          <MaterialIcon name="block" className={iconClass} />
          <span>Blocked</span>
        </span>
      ),
    })
  }

  if (subtaskLabel) {
    items.push({
      key: 'subtasks',
      node: (
        <span className={`flex items-center gap-1 ${textClass}`}>
          <MaterialIcon name="account_tree" className={iconClass} />
          <span>{subtaskLabel}</span>
        </span>
      ),
    })
  } else if (checklistLabel) {
    items.push({
      key: 'checklist',
      node: (
        <span className={`flex items-center gap-1 ${textClass}`}>
          <MaterialIcon name="checklist" className={iconClass} />
          <span>{checklistLabel}</span>
        </span>
      ),
    })
  }

  if (timeLabel) {
    items.push({
      key: 'time',
      node: (
        <span className={`flex items-center gap-1 ${textClass}`}>
          <MaterialIcon name="schedule" className={iconClass} />
          <span>{timeLabel}</span>
        </span>
      ),
    })
  }

  if (hasAttachments) {
    items.push({
      key: 'attach',
      node: (
        <span className={`flex items-center gap-1 ${textClass}`} title="Has attachments">
          <MaterialIcon name="attach_file" className={iconClass} />
        </span>
      ),
    })
  }

  if (items.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.key}>{item.node}</span>
      ))}
    </div>
  )
}
