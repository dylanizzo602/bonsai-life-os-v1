/* partitionBonsaiTasks: Today's Lineup vs backlog (All Tasks pool + rules) */

import type { Task, TaskPriority } from '../types'
import { isOverdue, isTodayInZone, taskDateToComparableMs } from './date'
import {
  isPriorityMediumOrAbove,
  isTaskAvailableForWork,
  isTaskBacklogUnavailable,
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
 * Auto-lineup eligibility (used for daily seed only): available to work now, then overdue,
 * due today, or medium+ priority. Unavailable tasks (blocked, future start, priority none) never qualify.
 */
export function isTaskInTodaysLineup(
  task: Task,
  blockedTaskIds: Set<string>,
  timeZone: string,
): boolean {
  if (!isBonsaiListTask(task) || !isInAllTasksPool(task)) return false
  if (!isTaskAvailableForWork(task, blockedTaskIds, timeZone)) return false

  const overdue = isOverdue(task.due_date, timeZone)
  const dueToday = isTodayInZone(task.due_date, timeZone)
  const mediumPlus = isPriorityMediumOrAbove(task.priority)

  return overdue || dueToday || mediumPlus
}

/**
 * Daily lineup seed: computed once per day (then persisted) so the lineup does not reshuffle.
 * Rules:
 * - Always include overdue and due-today tasks (can exceed the minimum).
 * - If overdue+due-today count is below `minCount`, pull in next available (workable now) medium+ tasks until `minCount`.
 * - Sorting uses the same "available" style ordering for consistency.
 */
export function buildTodaysLineupSeedTasks(
  tasks: Task[],
  blockedTaskIds: Set<string>,
  timeZone: string,
  minCount: number = 5,
): Task[] {
  /* Base pool: Bonsai-visible tasks that are not completed */
  const pool = tasks.filter((t) => isBonsaiListTask(t) && isInAllTasksPool(t))

  /* Always-in seed tasks: overdue or due today, and available to work now */
  const mustInclude = pool.filter(
    (t) =>
      isTaskAvailableForWork(t, blockedTaskIds, timeZone) &&
      (isOverdue(t.due_date, timeZone) || isTodayInZone(t.due_date, timeZone)),
  )
  const mustIncludeIds = new Set(mustInclude.map((t) => t.id))

  /* Top-up candidates: available to work now + medium priority or above, excluding already-included */
  const fillCandidates = pool.filter((t) => {
    if (mustIncludeIds.has(t.id)) return false
    return isTaskAvailableForWork(t, blockedTaskIds, timeZone) && isPriorityMediumOrAbove(t.priority)
  })

  /* Seed selection: include all must-includes; then top up to minCount */
  const selected: Task[] = [...mustInclude]
  if (selected.length < minCount) {
    const sortedFill = sortTasksAvailableStyle(fillCandidates, timeZone)
    for (const t of sortedFill) {
      selected.push(t)
      if (selected.length >= minCount) break
    }
  }

  /* Final ordering: keep consistent ordering for the full seed set */
  return sortTasksAvailableStyle(selected, timeZone)
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
 * Lineup: persisted daily picks only (no live re-seeding); unavailable tasks hidden.
 * Other: remainder; sorted via sortOtherTasksBacklog.
 */
/** Whether a task belongs in Today's Lineup (persisted picks minus exclusions; must still be available). */
export function isTaskInDisplayedLineup(
  task: Task,
  blockedTaskIds: Set<string>,
  timeZone: string,
  lineUpTaskIds: Set<string> = new Set(),
  lineupExcludedTaskIds: Set<string> = new Set(),
): boolean {
  if (lineupExcludedTaskIds.has(task.id)) return false
  if (!lineUpTaskIds.has(task.id)) return false
  return isTaskAvailableForWork(task, blockedTaskIds, timeZone)
}

export function partitionBonsaiSections(
  tasks: Task[],
  blockedTaskIds: Set<string>,
  timeZone: string,
  searchQuery: string,
  lineUpTaskIds: Set<string> = new Set(),
  lineupExcludedTaskIds: Set<string> = new Set(),
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
    allPool.filter((t) =>
      isTaskInDisplayedLineup(t, blockedTaskIds, timeZone, lineUpTaskIds, lineupExcludedTaskIds),
    ),
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

export interface BonsaiBacklogAvailabilitySplit {
  availablePool: Task[]
  unavailablePool: Task[]
}

/**
 * Split sorted backlog pool into available vs unavailable while preserving sort order.
 * Subtasks inherit their parent's bucket when the parent is in the backlog (not lineup).
 */
export function splitBacklogPoolByAvailability(
  backlogPool: Task[],
  allTasks: Task[],
  lineupIds: Set<string>,
  blockedTaskIds: Set<string>,
  timeZone: string,
): BonsaiBacklogAvailabilitySplit {
  const taskById = new Map(allTasks.map((t) => [t.id, t] as const))
  const availablePool: Task[] = []
  const unavailablePool: Task[] = []

  const bucketFor = (task: Task): 'available' | 'unavailable' => {
    const subject =
      task.parent_id && !lineupIds.has(task.parent_id)
        ? taskById.get(task.parent_id) ?? task
        : task
    return isTaskBacklogUnavailable(subject, blockedTaskIds, timeZone)
      ? 'unavailable'
      : 'available'
  }

  for (const task of backlogPool) {
    if (bucketFor(task) === 'unavailable') {
      unavailablePool.push(task)
    } else {
      availablePool.push(task)
    }
  }

  return { availablePool, unavailablePool }
}
