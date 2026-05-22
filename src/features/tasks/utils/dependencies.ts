/* dependencies: Shared blocked/blocking resolution (incomplete blockers only) */

import type { Task, TaskDependency } from '../types'

export type TaskLookup = Map<string, Task> | Record<string, Task>

/** Resolve a task by id from a Map or plain record. */
function getTaskFromLookup(lookup: TaskLookup, taskId: string): Task | undefined {
  if (lookup instanceof Map) return lookup.get(taskId)
  return lookup[taskId]
}

/** Blocked-by edges whose blocker exists and is not completed. */
export function getActiveBlockedByDeps(
  blockedBy: TaskDependency[],
  taskLookup: TaskLookup,
): TaskDependency[] {
  return blockedBy.filter((dep) => {
    const blocker = getTaskFromLookup(taskLookup, dep.blocker_id)
    return blocker != null && blocker.status !== 'completed'
  })
}

/** Blocking edges whose blocked task exists and is not completed. */
export function getActiveBlockingDeps(
  blocking: TaskDependency[],
  taskLookup: TaskLookup,
): TaskDependency[] {
  return blocking.filter((dep) => {
    const blocked = getTaskFromLookup(taskLookup, dep.blocked_id)
    return blocked != null && blocked.status !== 'completed'
  })
}

/** Row enrichment flags from raw dependency lists and task statuses. */
export function getDependencyEnrichmentFlags(
  blockedBy: TaskDependency[],
  blocking: TaskDependency[],
  taskLookup: TaskLookup,
): {
  isBlocked: boolean
  blockedByCount: number
  isBlocking: boolean
  blockingCount: number
} {
  const activeBlockedBy = getActiveBlockedByDeps(blockedBy, taskLookup)
  const activeBlocking = getActiveBlockingDeps(blocking, taskLookup)
  return {
    isBlocked: activeBlockedBy.length > 0,
    blockedByCount: activeBlockedBy.length,
    isBlocking: activeBlocking.length > 0,
    blockingCount: activeBlocking.length,
  }
}

/** Bulk edges from getDependenciesForTaskIds → set of actively blocked task ids. */
export function computeBlockedTaskIds(
  edges: { blocked_id: string; blocker_id: string }[],
  taskLookup: TaskLookup,
): Set<string> {
  const blocked = new Set<string>()
  for (const edge of edges) {
    const blocker = getTaskFromLookup(taskLookup, edge.blocker_id)
    if (blocker && blocker.status !== 'completed') {
      blocked.add(edge.blocked_id)
    }
  }
  return blocked
}

/** Task ids that block at least one incomplete task (for dependency filters). */
export function computeBlockingTaskIds(
  edges: { blocked_id: string; blocker_id: string }[],
  taskLookup: TaskLookup,
): Set<string> {
  const blocking = new Set<string>()
  for (const edge of edges) {
    const blocked = getTaskFromLookup(taskLookup, edge.blocked_id)
    if (blocked && blocked.status !== 'completed') {
      blocking.add(edge.blocker_id)
    }
  }
  return blocking
}
