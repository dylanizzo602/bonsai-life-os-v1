/* filterEvaluation: Recursive ClickUp-style filter tree evaluation */

import type { Task } from '../types'
import type {
  FilterConditionLeaf,
  FilterNode,
  FilterRoot,
} from '../types/filter'
import { taskDateToComparableMs } from './date'
import { isDateFieldId } from './filterFields'

export interface FilterEvaluationContext {
  blockedIds: Set<string>
  blockingIds: Set<string>
  timeZone: string
}

export type ScheduleLikeRow = { name: string; remind_at: string | null }

/** Date preset → [start, end] ms */
export function getDateRangeForPreset(
  preset: string,
  kind: 'start' | 'due',
): { start: number; end: number } | null {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const dayMs = 24 * 60 * 60 * 1000
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6)
  nextWeekEnd.setHours(23, 59, 59, 999)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6)
  lastWeekEnd.setHours(23, 59, 59, 999)

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999)
  const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1)
  const lastMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59, 999)

  const lastYearStart = new Date(todayStart.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(todayStart.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
  const nextYearStart = new Date(todayStart.getFullYear() + 1, 0, 1)
  const nextYearEnd = new Date(todayStart.getFullYear() + 1, 11, 31, 23, 59, 59, 999)

  const quarter = Math.floor(todayStart.getMonth() / 3) + 1
  const thisQuarterStart = new Date(todayStart.getFullYear(), (quarter - 1) * 3, 1)
  const thisQuarterEnd = new Date(todayStart.getFullYear(), quarter * 3, 0, 23, 59, 59, 999)
  const lastQuarterStart = new Date(todayStart.getFullYear(), (quarter - 2) * 3, 1)
  const lastQuarterEnd = new Date(todayStart.getFullYear(), (quarter - 1) * 3, 0, 23, 59, 59, 999)
  const nextQuarterStart = new Date(todayStart.getFullYear(), quarter * 3, 1)
  const nextQuarterEnd = new Date(todayStart.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)

  switch (preset) {
    case 'Today':
      return { start: todayStart.getTime(), end: todayEnd.getTime() }
    case 'Yesterday': {
      const y = new Date(todayStart)
      y.setDate(y.getDate() - 1)
      const yEnd = new Date(y)
      yEnd.setHours(23, 59, 59, 999)
      return { start: y.getTime(), end: yEnd.getTime() }
    }
    case 'Tomorrow': {
      const t = new Date(todayStart)
      t.setDate(t.getDate() + 1)
      const tEnd = new Date(t)
      tEnd.setHours(23, 59, 59, 999)
      return { start: t.getTime(), end: tEnd.getTime() }
    }
    case 'Next 7 days': {
      const end = new Date(todayStart)
      end.setDate(end.getDate() + 7)
      end.setHours(23, 59, 59, 999)
      return { start: todayStart.getTime(), end: end.getTime() }
    }
    case 'Last 7 days': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 6)
      return { start: start.getTime(), end: todayEnd.getTime() }
    }
    case 'This week':
      return { start: weekStart.getTime(), end: weekEnd.getTime() }
    case 'Next week':
      return { start: nextWeekStart.getTime(), end: nextWeekEnd.getTime() }
    case 'Last week':
      return { start: lastWeekStart.getTime(), end: lastWeekEnd.getTime() }
    case 'Last month':
      return { start: lastMonthStart.getTime(), end: lastMonthEnd.getTime() }
    case 'This month':
      return { start: monthStart.getTime(), end: monthEnd.getTime() }
    case 'Next year':
      return { start: nextYearStart.getTime(), end: nextYearEnd.getTime() }
    case 'Last year':
      return { start: lastYearStart.getTime(), end: lastYearEnd.getTime() }
    case 'Today & earlier':
      return { start: 0, end: todayEnd.getTime() }
    case 'Now & earlier':
    case 'Now or earlier':
      return kind === 'start' ? { start: 0, end: now.getTime() } : null
    case 'Later than now':
    case 'Later':
      return kind === 'start' ? { start: now.getTime() + dayMs, end: Number.MAX_SAFE_INTEGER } : null
    case 'Last quarter':
      return { start: lastQuarterStart.getTime(), end: lastQuarterEnd.getTime() }
    case 'This quarter':
      return { start: thisQuarterStart.getTime(), end: thisQuarterEnd.getTime() }
    case 'Next quarter':
      return { start: nextQuarterStart.getTime(), end: nextQuarterEnd.getTime() }
    case 'Overdue':
      return kind === 'due' ? { start: 0, end: todayStart.getTime() - 1 } : null
    case 'Any date':
      return { start: 0, end: Number.MAX_SAFE_INTEGER }
    default:
      return null
  }
}

export function parseDateValue(
  val: string,
): { start: number; end: number; mode: 'exact' | 'before' | 'after' | 'range' } | null {
  const dayMs = 24 * 60 * 60 * 1000
  const toRange = (d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
    const start = new Date(d + 'T00:00:00').getTime()
    if (Number.isNaN(start)) return null
    return { start, end: start + dayMs - 1 }
  }
  if (val.startsWith('exact:')) {
    const r = toRange(val.slice(6))
    return r ? { ...r, mode: 'exact' } : null
  }
  if (val.startsWith('before:')) {
    const r = toRange(val.slice(7))
    return r ? { ...r, mode: 'before' } : null
  }
  if (val.startsWith('after:')) {
    const r = toRange(val.slice(6))
    return r ? { ...r, mode: 'after' } : null
  }
  if (val.startsWith('range:')) {
    const parts = val.slice(6).split(':')
    if (parts.length < 2) return null
    const r1 = toRange(parts[0])
    const r2 = toRange(parts[1])
    if (!r1 || !r2) return null
    return { start: r1.start, end: r2.end, mode: 'range' }
  }
  return null
}

function getTaskDateIso(task: Task, fieldId: string, timeZone: string): number | null {
  if (fieldId === 'start_date') return taskDateToComparableMs(task.start_date, timeZone)
  if (fieldId === 'due_date') return taskDateToComparableMs(task.due_date, timeZone)
  if (fieldId === 'created_at') return taskDateToComparableMs(task.created_at, timeZone)
  if (fieldId === 'updated_at') return taskDateToComparableMs(task.updated_at, timeZone)
  if (fieldId === 'completed_at') return taskDateToComparableMs(task.completed_at, timeZone)
  return null
}

function evaluateDateCondition(
  iso: number | null,
  operator: string,
  value: string,
  valLower: string,
  presetKind: 'start' | 'due',
  allowNullStartAvailability: boolean,
): boolean {
  const getRangeForDateValue = (v: string) => {
    const parsed = parseDateValue(v)
    if (parsed) return parsed
    const presetRange = getDateRangeForPreset(v, presetKind)
    if (presetRange) return { ...presetRange, mode: 'exact' as const }
    return null
  }

  if (operator === 'is_set') return iso != null
  if (operator === 'is_not_set') return iso == null
  if (valLower === 'no date' && (operator === 'is' || operator === 'is_not')) {
    return operator === 'is' ? iso == null : iso != null
  }
  if (valLower === 'any date' && (operator === 'is' || operator === 'is_not')) {
    return operator === 'is' ? iso != null : iso == null
  }
  const range = getRangeForDateValue(value)
  if (range && operator === 'is') {
    if (iso == null && allowNullStartAvailability) return true
    if (iso == null) return false
    if (range.mode === 'before') return iso < range.start
    if (range.mode === 'after') return iso > range.end
    return iso >= range.start && iso <= range.end
  }
  if (range && operator === 'is_not') {
    if (iso == null) return true
    if (range.mode === 'before') return iso >= range.start
    if (range.mode === 'after') return iso <= range.end
    return iso < range.start || iso > range.end
  }
  if (iso != null && range && operator === 'before') return iso < range.start
  if (iso != null && range && operator === 'after') return iso > range.end
  return true
}

/** Evaluate one condition leaf against a task */
export function evaluateFilterCondition(
  c: Pick<FilterConditionLeaf, 'field' | 'operator' | 'value'>,
  t: Task,
  ctx: FilterEvaluationContext,
): boolean {
  const val = (c.value ?? '').trim()
  const valLower = val.toLowerCase()
  const title = (t.title ?? '').toLowerCase()
  const statusMap: Record<string, Task['status']> = {
    open: 'active',
    'in progress': 'in_progress',
    closed: 'completed',
    complete: 'completed',
    archived: 'archived',
  }
  const priorityMap: Record<string, Task['priority']> = {
    none: 'none',
    low: 'low',
    medium: 'medium',
    normal: 'medium',
    high: 'high',
    urgent: 'urgent',
  }

  if (c.field === 'status') {
    const match = statusMap[valLower] ?? (c.value as Task['status'])
    if (c.operator === 'is') return t.status === match
    if (c.operator === 'is_not') return t.status !== match
    return true
  }

  if (c.field === 'task_name') {
    if (c.operator === 'contains') return title.includes(valLower)
    if (c.operator === 'does_not_contain') return !title.includes(valLower)
    return true
  }

  if (c.field === 'priority') {
    const effectivePriority = t.priority ?? 'medium'
    if (c.operator === 'is_set') return t.priority != null
    if (c.operator === 'is_not_set') return t.priority == null
    const match = priorityMap[valLower] ?? (c.value as Task['priority'])
    if (c.operator === 'is') return effectivePriority === match
    if (c.operator === 'is_not') return effectivePriority !== match
    return true
  }

  if (isDateFieldId(c.field)) {
    const iso = getTaskDateIso(t, c.field, ctx.timeZone)
    const presetKind = c.field === 'due_date' ? 'due' : 'start'
    const allowNullStart =
      c.field === 'start_date' &&
      (valLower === 'now & earlier' || valLower === 'today & earlier')
    return evaluateDateCondition(iso, c.operator, val, valLower, presetKind, allowNullStart)
  }

  if (c.field === 'tags') {
    const taskTagNames = (t.tags ?? []).map((tag) => (tag.name ?? '').toLowerCase())
    const hasNoTags = taskTagNames.length === 0
    if (c.operator === 'is_set') return !hasNoTags
    if (c.operator === 'is_not_set') return hasNoTags
    const selected = (c.value ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const noTagsSelected = selected.includes('no tags')
    const tagNamesSelected = selected.filter((s) => s !== 'no tags')
    if (c.operator === 'is') {
      if (noTagsSelected && hasNoTags) return true
      if (tagNamesSelected.length === 0) return noTagsSelected ? hasNoTags : true
      return tagNamesSelected.some((name) => taskTagNames.includes(name))
    }
    if (c.operator === 'is_not') {
      if (noTagsSelected && hasNoTags) return false
      if (noTagsSelected && !hasNoTags) return true
      if (tagNamesSelected.length === 0) return true
      return !tagNamesSelected.some((name) => taskTagNames.includes(name))
    }
    return true
  }

  if (c.field === 'dependencies') {
    const waitingOn = ctx.blockedIds.has(t.id)
    const blocking = ctx.blockingIds.has(t.id)
    const hasAny = waitingOn || blocking
    if (valLower === 'waiting on') {
      return c.operator === 'has' ? waitingOn : !waitingOn
    }
    if (valLower === 'blocking') {
      return c.operator === 'has' ? blocking : !blocking
    }
    if (valLower === 'any') {
      return c.operator === 'has' ? hasAny : !hasAny
    }
    return true
  }

  if (c.field === 'recurring') {
    const isRecurring = Boolean(t.recurrence_pattern)
    if (c.operator === 'is_recurring') return isRecurring
    if (c.operator === 'is_not_recurring') return !isRecurring
    return true
  }

  if (c.field === 'time_estimate') {
    const mins = t.time_estimate ?? 0
    if (c.operator === 'is_set') return t.time_estimate != null && t.time_estimate > 0
    if (c.operator === 'is_not_set') return t.time_estimate == null || t.time_estimate === 0
    const num = Number(c.value)
    if (Number.isNaN(num)) return true
    if (c.operator === 'greater_than') return mins > num
    if (c.operator === 'less_than') return mins < num
    if (c.operator === 'equal_to') return mins === num
    return true
  }

  return true
}

export function evaluateFilterConditionForReminder(
  c: Pick<FilterConditionLeaf, 'field' | 'operator' | 'value'>,
  r: ScheduleLikeRow,
): boolean {
  const val = (c.value ?? '').trim()
  const valLower = val.toLowerCase()
  const name = (r.name ?? '').toLowerCase()

  if (c.field === 'task_name') {
    if (c.operator === 'contains') return name.includes(valLower)
    if (c.operator === 'does_not_contain') return !name.includes(valLower)
    return true
  }

  if (c.field === 'start_date' || c.field === 'due_date') {
    const iso = r.remind_at ? new Date(r.remind_at).getTime() : null
    const kind = c.field === 'start_date' ? 'start' : 'due'
    return evaluateDateCondition(iso, c.operator, val, valLower, kind, false)
  }

  return true
}

function evaluateNode(node: FilterNode, task: Task, ctx: FilterEvaluationContext): boolean {
  if (node.type === 'condition') {
    return evaluateFilterCondition(node, task, ctx)
  }
  return evaluateSiblingList(node.children, task, ctx)
}

/** Left-to-right fold with per-sibling And/Or (ClickUp mixed filters) */
export function evaluateSiblingList(
  nodes: FilterNode[],
  task: Task,
  ctx: FilterEvaluationContext,
): boolean {
  if (nodes.length === 0) return true
  let acc = false
  for (let i = 0; i < nodes.length; i++) {
    const match = evaluateNode(nodes[i], task, ctx)
    const op = i === 0 ? null : nodes[i].combineWithPrevious ?? 'and'
    acc = i === 0 ? match : op === 'or' ? acc || match : acc && match
  }
  return acc
}

export function matchesFilterRoot(root: FilterRoot, task: Task, ctx: FilterEvaluationContext): boolean {
  if (root.children.length === 0) return true
  return evaluateSiblingList(root.children, task, ctx)
}

export function isFilterRootActive(root: FilterRoot): boolean {
  return root.children.length > 0
}

/** All condition leaves in tree order (for chips / habit filters) */
export function flattenConditionLeaves(root: FilterRoot): FilterConditionLeaf[] {
  const out: FilterConditionLeaf[] = []
  const walk = (nodes: FilterNode[]) => {
    for (const node of nodes) {
      if (node.type === 'condition') {
        out.push(node)
      } else {
        walk(node.children)
      }
    }
  }
  walk(root.children)
  return out
}

/** Evaluate flat leaf list with combineWithPrevious (habit reminders) */
export function evaluateFlatConditionsForReminder(
  conditions: Pick<FilterConditionLeaf, 'field' | 'operator' | 'value' | 'combineWithPrevious'>[],
  row: ScheduleLikeRow,
): boolean {
  if (conditions.length === 0) return true
  let result = false
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i]
    const match = evaluateFilterConditionForReminder(c, row)
    const combine = i === 0 ? undefined : c.combineWithPrevious ?? 'and'
    if (i === 0) result = match
    else result = combine === 'or' ? result || match : result && match
  }
  return result
}
