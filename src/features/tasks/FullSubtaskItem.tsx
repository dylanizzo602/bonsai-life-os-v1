/* FullSubtaskItem component: Desktop full-width subtask row with left/right metadata */

import { FullTaskItem } from './FullTaskItem'
import type { Task, TaskStatus, UpdateTaskInput } from './types'

export interface FullSubtaskItemProps {
  /** Subtask data to display */
  subtask: Task
  /** Checklist completed/total when subtask has checklists */
  checklistSummary?: { completed: number; total: number }
  /** Subtask is blocked by another (show blocked icon) */
  isBlocked?: boolean
  /** Subtask is blocking another (show warning icon) */
  isBlocking?: boolean
  /** Number of tasks this subtask is blocking (for tooltip) */
  blockingCount?: number
  /** Number of tasks blocking this subtask (for tooltip) */
  blockedByCount?: number
  /** Subtask is shared with another user (show two-person icon) */
  isShared?: boolean
  /** Optional click on the row (e.g. open edit) */
  onClick?: () => void
  /** Function to update subtask status */
  onUpdateStatus?: (taskId: string, status: TaskStatus) => Promise<void>
  /** Function to update subtask (for time estimate and other fields) */
  onUpdateTask?: (taskId: string, input: UpdateTaskInput) => Promise<void>
  /** Called after tags are updated (e.g. to refetch subtask list) */
  onTagsUpdated?: () => void
}

/**
 * Full-width subtask item component.
 * Wraps FullTaskItem with subtask-specific defaults (no subtasks, no expand).
 * Subtasks are displayed with the same container and styling as parent tasks.
 */
export function FullSubtaskItem({
  subtask,
  checklistSummary,
  isBlocked = false,
  isBlocking = false,
  isShared = false,
  onClick,
  blockingCount = 0,
  blockedByCount = 0,
  onUpdateStatus,
  onUpdateTask,
  onTagsUpdated,
}: FullSubtaskItemProps) {
  return (
    <FullTaskItem
      task={subtask}
      onClick={onClick}
      hasSubtasks={false}
      checklistSummary={checklistSummary}
      isBlocked={isBlocked}
      isBlocking={isBlocking}
      isShared={isShared}
      blockingCount={blockingCount}
      blockedByCount={blockedByCount}
      onUpdateStatus={onUpdateStatus}
      onUpdateTask={onUpdateTask}
      onTagsUpdated={onTagsUpdated}
      tablet={true}
    />
  )
}
