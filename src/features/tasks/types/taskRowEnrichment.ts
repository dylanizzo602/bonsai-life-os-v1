/* taskRowEnrichment: Per-task display metadata loaded for Bonsai task rows */

export interface TaskRowEnrichment {
  checklistSummary?: { completed: number; total: number }
  hasSubtasks: boolean
  subtaskCount: number
  incompleteSubtaskCount: number
  subtaskTimeTotal: number
  isBlocked: boolean
  isBlocking: boolean
  blockingCount: number
  blockedByCount: number
}

export const EMPTY_TASK_ENRICHMENT: TaskRowEnrichment = {
  hasSubtasks: false,
  subtaskCount: 0,
  incompleteSubtaskCount: 0,
  subtaskTimeTotal: 0,
  isBlocked: false,
  isBlocking: false,
  blockingCount: 0,
  blockedByCount: 0,
}
