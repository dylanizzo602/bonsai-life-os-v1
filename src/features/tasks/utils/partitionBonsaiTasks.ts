/* partitionBonsaiTasks: Today's Lineup vs Other tasks (All Tasks pool + rules) */

import type { Task, TaskPriority } from '../types'
import { isTodayInZone, taskDateToComparableMs } from './date'
import {
  isPriorityMediumOrAbove,
  isTaskAvailableForWork,
  sortTasksAvailableStyle,
} from './available'

/** Active tasks shown in Bonsai lists (not archived, deleted, or habit-linked). */
function isBonsaiListTask(task: Task): boolean {
  return (
    task.status !== 'archived' &&
    task.status !== 'deleted' &&
    !task.habit_id
  )
}

/** Client-side search on title and description. */
function matchesSearch(task: Task, searchQuery: string): boolean {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return true
  return (
    (task.title ?? '').toLowerCase().includes(q) ||
    (task.description ?? '').toLowerCase().includes(q)
  )
}

/** All Tasks view: status is not complete. */
function isInAllTasksPool(task: Task): boolean {
  return task.status !== 'completed'
}

/**
 * Today's Lineup: due today OR (available to work now AND medium priority or above).
 */
export function isTaskInTodaysLineup(
  task: Task,
  blockedTaskIds: Set<string>,
  timeZone: string,
): boolean {
  if (!isBonsaiListTask(task) || !isInAllTasksPool(task)) return false

  const dueToday = isTodayInZone(task.due_date, timeZone)
  const availableMediumPlus =
    isTaskAvailableForWork(task, blockedTaskIds, timeZone) &&
    isPriorityMediumOrAbove(task.priority)

  return dueToday || availableMediumPlus
}

/** Priority rank for Other tasks sort (higher index = higher priority). */
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

/**
 * Other tasks grouping: (1) due only, (2) no dates, (3) has start (with or without due).
 */
function getOtherTasksDateGroup(task: Task, timeZone: string): number {
  const hasDue = taskDateToComparableMs(task.due_date, timeZone) != null
  const hasStart = taskDateToComparableMs(task.start_date, timeZone) != null
  if (hasDue && !hasStart) return 0
  if (!hasDue && !hasStart) return 1
  return 2
}

/** Compare priority high→low. */
function comparePriorityDesc(a: Task, b: Task): number {
  const aPri = PRIORITY_ORDER[a.priority] ?? 0
  const bPri = PRIORITY_ORDER[b.priority] ?? 0
  return bPri - aPri
}

/** Compare due soonest→latest (no due sorts last). */
function compareDueAsc(a: Task, b: Task, timeZone: string): number {
  const aDue = taskDateToComparableMs(a.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
  const bDue = taskDateToComparableMs(b.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
  return aDue - bDue
}

/** Compare start soonest→latest (no start sorts last). */
function compareStartAsc(a: Task, b: Task, timeZone: string): number {
  const aStart = taskDateToComparableMs(a.start_date, timeZone) ?? Number.MAX_SAFE_INTEGER
  const bStart = taskDateToComparableMs(b.start_date, timeZone) ?? Number.MAX_SAFE_INTEGER
  return aStart - bStart
}

/** Start-date group: soonest start → soonest due → highest priority. */
function compareStartDateGroup(a: Task, b: Task, timeZone: string): number {
  const start = compareStartAsc(a, b, timeZone)
  if (start !== 0) return start

  const due = compareDueAsc(a, b, timeZone)
  if (due !== 0) return due

  return comparePriorityDesc(a, b)
}

/**
 * Within-group sort: due-only / no-date use priority then due;
 * has-start group uses start → due → priority.
 */
function compareWithinOtherTasksGroup(a: Task, b: Task, timeZone: string): number {
  const group = getOtherTasksDateGroup(a, timeZone)
  if (group === 2) {
    return compareStartDateGroup(a, b, timeZone)
  }

  const pri = comparePriorityDesc(a, b)
  if (pri !== 0) return pri

  return compareDueAsc(a, b, timeZone)
}

/**
 * Other tasks sort: date group, then within-group rules above.
 */
export function sortOtherTasksBacklog(tasks: Task[], timeZone: string): Task[] {
  return [...tasks].sort((a, b) => {
    /* Priority "none": always sort to the very end of Other tasks. */
    const aNone = a.priority === 'none'
    const bNone = b.priority === 'none'
    if (aNone !== bNone) return aNone ? 1 : -1

    const groupCmp = getOtherTasksDateGroup(a, timeZone) - getOtherTasksDateGroup(b, timeZone)
    if (groupCmp !== 0) return groupCmp
    return compareWithinOtherTasksGroup(a, b, timeZone)
  })
}

export interface BonsaiSectionPartition {
  lineupTasks: Task[]
  backlogPool: Task[]
  lineupIds: Set<string>
}

export interface BonsaiBacklogPartition {
  parentTasks: Task[]
  subtasksByParentId: Map<string, Task[]>
}

/**
 * Build Bonsai sections from the full task list.
 * Universe: All Tasks (not complete), then search.
 * Lineup: due today OR available + medium+; sorted like Available view.
 * Other: remainder; sorted via sortOtherTasksBacklog.
 */
export function partitionBonsaiSections(
  tasks: Task[],
  blockedTaskIds: Set<string>,
  timeZone: string,
  searchQuery: string,
): BonsaiSectionPartition {
  const taskById = new Map(tasks.map((t) => [t.id, t] as const))
  const baseTasks = tasks.filter((t) => {
    if (t.status === 'deleted') return false
    if (t.habit_id) return false
    if (t.parent_id) {
      const parent = taskById.get(t.parent_id)
      if (parent?.status === 'deleted' || parent?.status === 'archived') return false
    }
    return true
  })

  const allPool = baseTasks
    .filter((t) => isBonsaiListTask(t) && isInAllTasksPool(t))
    .filter((t) => matchesSearch(t, searchQuery))

  const lineupTasks = sortTasksAvailableStyle(
    allPool.filter((t) => isTaskInTodaysLineup(t, blockedTaskIds, timeZone)),
    timeZone,
  )
  const lineupIds = new Set(lineupTasks.map((t) => t.id))
  const backlogPool = sortOtherTasksBacklog(
    allPool.filter((t) => !lineupIds.has(t.id)),
    timeZone,
  )

  return { lineupTasks, backlogPool, lineupIds }
}

/**
 * Backlog rows: top-level tasks with subtasks grouped (excluding lineup parents).
 */
export function buildBacklogPartition(
  backlogPool: Task[],
  lineupIds: Set<string>,
  timeZone: string,
): BonsaiBacklogPartition {
  const inPool = backlogPool.filter(
    (t) => isBonsaiListTask(t) && !lineupIds.has(t.id),
  )
  const parentTasks = sortOtherTasksBacklog(
    inPool.filter((t) => !t.parent_id),
    timeZone,
  )
  const subtasksByParentId = new Map<string, Task[]>()

  for (const task of inPool) {
    if (!task.parent_id) continue
    if (lineupIds.has(task.parent_id)) continue
    const list = subtasksByParentId.get(task.parent_id) ?? []
    list.push(task)
    subtasksByParentId.set(task.parent_id, list)
  }

  for (const [parentId, subtasks] of subtasksByParentId) {
    subtasksByParentId.set(parentId, sortOtherTasksBacklog(subtasks, timeZone))
  }

  return { parentTasks, subtasksByParentId }
}
