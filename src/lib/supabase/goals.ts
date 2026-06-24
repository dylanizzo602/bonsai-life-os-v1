/* Goal data access layer: Supabase CRUD for goals, milestones, habit links, and history */
import { supabase } from './client'
import { cachedQuery, invalidateQueryCache, QUERY_CACHE_PREFIX } from './queryCache'
import { getTasksByIds, getTaskTreeForProgress } from './tasks'
import type { Task } from '../../features/tasks/types'
import type {
  Goal,
  GoalMilestone,
  GoalHistory,
  GoalWithDetails,
  CreateGoalInput,
  UpdateGoalInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../../features/goals/types'
import {
  getBooleanMilestoneProgressPercent,
  getNumberMilestoneProgressPercent,
  getTaskMilestoneProgressPercentFromTree,
} from '../../features/goals/utils/milestoneProgress'

/** Invalidate cached goal and milestone reads after goal writes */
function invalidateGoalsCache(): void {
  invalidateQueryCache(QUERY_CACHE_PREFIX.goals)
  invalidateQueryCache(QUERY_CACHE_PREFIX.milestonesByGoals)
}

/** Run a goal mutation and drop stale goal caches on success */
async function withGoalsCacheInvalidation<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn()
  invalidateGoalsCache()
  return result
}

/** Cache key for batched milestone fetch by goal ids */
function buildMilestonesByGoalIdsCacheKey(goalIds: string[]): string {
  const sortedIds = [...goalIds].sort().join(',')
  return `${QUERY_CACHE_PREFIX.milestonesByGoals}${sortedIds}`
}

/* Format a milestone numeric field for human-readable goal history lines */
function formatMilestoneQuantity(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  const num = Number(n)
  if (Number.isInteger(num)) return String(num)
  const rounded = Math.round(num * 1000) / 1000
  return String(rounded)
}

/* Compare milestone numeric DB fields (may be string or number) */
function milestoneNumericEqual(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a === null || a === undefined) return b === null || b === undefined
  if (b === null || b === undefined) return false
  return Number(a) === Number(b)
}

/* Compare linked task id sets (order-independent) */
function linkedTaskIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

/** Junction row shape from goal_milestone_tasks */
interface MilestoneTaskLinkRow {
  milestone_id: string
  task_id: string
  sort_order: number
}

/** Fetch linked task ids per milestone from junction table */
async function getMilestoneTaskIdsByMilestoneId(
  milestoneIds: string[],
): Promise<Record<string, string[]>> {
  if (milestoneIds.length === 0) return {}

  const { data, error } = await supabase
    .from('goal_milestone_tasks')
    .select('milestone_id, task_id, sort_order')
    .in('milestone_id', milestoneIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching milestone task links:', error)
    throw error
  }

  const map: Record<string, string[]> = {}
  for (const row of (data ?? []) as MilestoneTaskLinkRow[]) {
    if (!map[row.milestone_id]) map[row.milestone_id] = []
    map[row.milestone_id].push(row.task_id)
  }
  return map
}

/** Replace junction rows for a milestone with the given task ids */
async function syncMilestoneTaskLinks(milestoneId: string, taskIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('goal_milestone_tasks')
    .delete()
    .eq('milestone_id', milestoneId)

  if (deleteError) {
    console.error('Error clearing milestone task links:', deleteError)
    throw deleteError
  }

  if (taskIds.length === 0) return

  const rows = taskIds.map((task_id, index) => ({
    milestone_id: milestoneId,
    task_id,
    sort_order: index,
  }))

  const { error: insertError } = await supabase.from('goal_milestone_tasks').insert(rows)

  if (insertError) {
    console.error('Error inserting milestone task links:', insertError)
    throw insertError
  }
}

/** Attach linked_tasks to milestone rows using a pre-fetched task map */
function attachLinkedTasks(
  milestones: GoalMilestone[],
  taskIdsByMilestoneId: Record<string, string[]>,
  taskMap: Map<string, Task>,
): GoalMilestone[] {
  return milestones.map((m) => {
    if (m.type !== 'task') return { ...m, linked_tasks: [] }
    const ids = taskIdsByMilestoneId[m.id] ?? []
    const linked_tasks = ids
      .map((id) => taskMap.get(id))
      .filter((t): t is Task => t != null)
    return { ...m, linked_tasks }
  })
}

/**
 * True when the milestone row changed only by completing (incomplete → complete).
 * In that case we log a single `milestone_completed` entry with detail, not a generic update.
 */
function isOnlyCompletionTransition(
  prev: GoalMilestone,
  next: GoalMilestone,
  prevTaskIds: string[],
  nextTaskIds: string[],
): boolean {
  if (prev.completed || !next.completed) return false
  return (
    prev.title === next.title &&
    (prev.description ?? '') === (next.description ?? '') &&
    linkedTaskIdsEqual(prevTaskIds, nextTaskIds) &&
    prev.type === next.type &&
    milestoneNumericEqual(prev.start_value, next.start_value) &&
    milestoneNumericEqual(prev.target_value, next.target_value) &&
    (prev.unit ?? '') === (next.unit ?? '') &&
    milestoneNumericEqual(prev.current_value, next.current_value) &&
    prev.sort_order === next.sort_order
  )
}

/* Human-readable line when a milestone is newly marked complete (no other edits). */
function describeMilestoneCompletedAlone(m: GoalMilestone): string {
  if (m.type === 'task') {
    return `Milestone "${m.title}" completed — linked task done`
  }
  if (m.type === 'number') {
    return `Milestone "${m.title}" marked complete`
  }
  return `Milestone "${m.title}" checked off`
}

/**
 * Build a detailed update description and metadata for milestone edits (excluding false→true completion-only).
 */
async function describeMilestoneChanges(
  prev: GoalMilestone,
  next: GoalMilestone,
  prevTaskIds: string[],
  nextTaskIds: string[],
): Promise<{ description: string; metadata: Record<string, unknown> }> {
  const parts: string[] = []
  const metadata: Record<string, unknown> = {
    milestone_id: next.id,
    milestone_type: next.type,
    milestone_title: next.title,
  }

  /* Title rename */
  if (prev.title !== next.title) {
    parts.push(`renamed "${prev.title}" → "${next.title}"`)
    metadata.previous_title = prev.title
    metadata.next_title = next.title
  }

  /* Description change */
  if ((prev.description ?? '') !== (next.description ?? '')) {
    parts.push('description updated')
    metadata.previous_description = prev.description
    metadata.next_description = next.description
  }

  /* Linked tasks change (task milestones) */
  if (!linkedTaskIdsEqual(prevTaskIds, nextTaskIds)) {
    const allIds = [...new Set([...prevTaskIds, ...nextTaskIds])]
    const tasks = allIds.length > 0 ? await getTasksByIds(allIds) : []
    const titles = new Map(tasks.map((t) => [t.id, t.title]))
    const prevLabels = prevTaskIds.map((id) => titles.get(id) ?? 'Task').join(', ') || 'None'
    const nextLabels = nextTaskIds.map((id) => titles.get(id) ?? 'Task').join(', ') || 'None'
    parts.push(`linked tasks "${prevLabels}" → "${nextLabels}"`)
    metadata.previous_task_ids = prevTaskIds
    metadata.next_task_ids = nextTaskIds
  }

  /* Number milestone: current value and deltas */
  if (!milestoneNumericEqual(prev.current_value, next.current_value)) {
    const unit = (next.unit ?? '').trim()
    const suffix = unit ? ` ${unit}` : ''
    const pv = formatMilestoneQuantity(prev.current_value as number | null)
    const nv = formatMilestoneQuantity(next.current_value as number | null)
    let deltaStr = ''
    if (prev.current_value != null && next.current_value != null) {
      const delta = Number(next.current_value) - Number(prev.current_value)
      if (!Number.isNaN(delta) && delta !== 0) {
        const sign = delta > 0 ? '+' : ''
        deltaStr = ` (${sign}${formatMilestoneQuantity(delta)}${suffix})`
      }
    }
    parts.push(`value ${pv} → ${nv}${suffix}${deltaStr}`)
    metadata.previous_current_value = prev.current_value
    metadata.next_current_value = next.current_value
    metadata.unit = next.unit
    if (
      prev.current_value != null &&
      next.current_value != null &&
      !Number.isNaN(Number(next.current_value) - Number(prev.current_value))
    ) {
      metadata.delta = Number(next.current_value) - Number(prev.current_value)
    }
  }

  if (!milestoneNumericEqual(prev.start_value, next.start_value)) {
    parts.push(
      `start ${formatMilestoneQuantity(prev.start_value as number | null)} → ${formatMilestoneQuantity(next.start_value as number | null)}`,
    )
    metadata.previous_start_value = prev.start_value
    metadata.next_start_value = next.start_value
  }

  if (!milestoneNumericEqual(prev.target_value, next.target_value)) {
    parts.push(
      `target ${formatMilestoneQuantity(prev.target_value as number | null)} → ${formatMilestoneQuantity(next.target_value as number | null)}`,
    )
    metadata.previous_target_value = prev.target_value
    metadata.next_target_value = next.target_value
  }

  if ((prev.unit ?? '') !== (next.unit ?? '')) {
    parts.push(`unit "${prev.unit ?? '—'}" → "${next.unit ?? '—'}"`)
    metadata.previous_unit = prev.unit
    metadata.next_unit = next.unit
  }

  /* Reopened (was complete, now not) */
  if (prev.completed && !next.completed) {
    parts.push('marked incomplete')
    metadata.completed_transition = 'reopened'
  }

  if (prev.sort_order !== next.sort_order) {
    parts.push(`order ${prev.sort_order} → ${next.sort_order}`)
    metadata.previous_sort_order = prev.sort_order
    metadata.next_sort_order = next.sort_order
  }

  const detail = parts.length > 0 ? parts.join(' · ') : 'details updated'
  const description = `Milestone "${next.title}": ${detail}`
  return { description, metadata }
}

/**
 * Fetch all goals ordered by created_at descending.
 * Returns both active and inactive goals; UI decides how to categorize.
 */
export async function getGoals(): Promise<Goal[]> {
  return cachedQuery(`${QUERY_CACHE_PREFIX.goals}all`, fetchGoalsUncached)
}

/** Uncached goals list fetch */
async function fetchGoalsUncached(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goals:', error)
    throw error
  }

  return (data ?? []) as Goal[]
}

/** Milestone with parent goal name for global search */
export interface GoalMilestoneWithGoalName extends GoalMilestone {
  goal_name: string
}

/**
 * Fetch all milestones for the current user with parent goal name (for global search).
 */
export async function getAllMilestones(): Promise<GoalMilestoneWithGoalName[]> {
  const goals = await getGoals()
  if (goals.length === 0) return []

  const goalIds = goals.map((g) => g.id)
  const goalNameById = new Map(goals.map((g) => [g.id, g.name]))

  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .in('goal_id', goalIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching all milestones:', error)
    throw error
  }

  return ((data ?? []) as GoalMilestone[]).map((m) => ({
    ...m,
    goal_name: goalNameById.get(m.goal_id) ?? 'Goal',
  }))
}

/**
 * Fetch a single goal with all related data (milestones, linked habits, computed progress).
 */
export async function getGoal(id: string): Promise<GoalWithDetails> {
  /* Fetch goal */
  const { data: goalData, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .single()

  if (goalError || !goalData) {
    console.error('Error fetching goal:', goalError)
    throw goalError ?? new Error('Goal not found')
  }

  const goal = goalData as Goal

  /* Fetch milestones for this goal */
  const { data: milestonesData, error: milestonesError } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (milestonesError) {
    console.error('Error fetching milestones:', milestonesError)
    throw milestonesError
  }

  const milestones = (milestonesData ?? []) as GoalMilestone[]

  /* Fetch linked tasks for task-type milestones via junction table */
  const taskMilestoneIds = milestones.filter((m) => m.type === 'task').map((m) => m.id)
  const taskIdsByMilestoneId = await getMilestoneTaskIdsByMilestoneId(taskMilestoneIds)
  const allTaskIds = [...new Set(Object.values(taskIdsByMilestoneId).flat())]
  const tasks = allTaskIds.length > 0 ? await getTasksByIds(allTaskIds) : []
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]))
  const milestonesWithTasks = attachLinkedTasks(milestones, taskIdsByMilestoneId, taskMap)

  /* Fetch linked habits */
  const { data: habitsData, error: habitsError } = await supabase
    .from('goal_habits')
    .select('id, habit_id, habit:habits(id, name, color)')
    .eq('goal_id', id)

  if (habitsError) {
    console.error('Error fetching linked habits:', habitsError)
    throw habitsError
  }

  /* Supabase returns FK relation as table name "habits"; alias "habit" may also be used */
  const linked_habits = (habitsData ?? []).map((gh: any) => ({
    id: gh.id,
    habit_id: gh.habit_id,
    habit: gh.habits ?? gh.habit ?? { id: gh.habit_id, name: 'Unknown', color: 'grey' },
  }))

  /* Calculate progress: average of each milestone’s 0–100% contribution */
  const computed_progress = await calculateProgressFromMilestones(milestones)

  return {
    ...goal,
    milestones: milestonesWithTasks,
    linked_habits,
    computed_progress,
  }
}

/**
 * Load task trees for all task-type milestones (parallel) for progress aggregation.
 */
export async function getTaskTreesByMilestoneId(
  milestones: GoalMilestone[],
): Promise<Record<string, Task[]>> {
  const taskMilestones = milestones.filter((m) => m.type === 'task')
  const taskIdsByMilestoneId = await getMilestoneTaskIdsByMilestoneId(
    taskMilestones.map((m) => m.id),
  )

  const entries = await Promise.all(
    taskMilestones.map(async (m) => {
      const rootIds =
        m.linked_tasks && m.linked_tasks.length > 0
          ? m.linked_tasks.map((t) => t.id)
          : (taskIdsByMilestoneId[m.id] ?? [])

      const trees = await Promise.all(rootIds.map((id) => getTaskTreeForProgress(id)))
      const seen = new Set<string>()
      const merged: Task[] = []
      for (const tree of trees) {
        for (const t of tree) {
          if (!seen.has(t.id)) {
            seen.add(t.id)
            merged.push(t)
          }
        }
      }
      return [m.id, merged] as const
    }),
  )
  return Object.fromEntries(entries)
}

/**
 * Calculate goal progress from milestones (equal weight average of each milestone’s 0–100%).
 * Boolean: 0 or 100. Number: linear from start to current toward target. Task: completed/total in tree.
 */
async function calculateProgressFromMilestones(milestones: GoalMilestone[]): Promise<number> {
  if (milestones.length === 0) return 0

  const taskTreesByMilestoneId = await getTaskTreesByMilestoneId(milestones)

  const parts = milestones.map((m) => {
    if (m.type === 'boolean') {
      return getBooleanMilestoneProgressPercent(m)
    }
    if (m.type === 'number') {
      return getNumberMilestoneProgressPercent(m)
    }
    if (m.type === 'task') {
      const tree = taskTreesByMilestoneId[m.id] ?? []
      return getTaskMilestoneProgressPercentFromTree(tree)
    }
    return 0
  })

  const sum = parts.reduce((a, b) => a + b, 0)
  return Math.round(sum / parts.length)
}

/**
 * Create a new goal and add initial history entry.
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  return withGoalsCacheInvalidation(async () => {
  const insertData: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? null,
    start_date: input.start_date ?? null,
    target_date: input.target_date ?? null,
    progress: input.progress ?? 0,
    is_active: input.is_active ?? true,
    icon_name: input.icon_name ?? 'potted_plant',
    category: input.category ?? null,
  }

  const { data, error } = await supabase
    .from('goals')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating goal:', error)
    throw error
  }

  const goal = data as Goal

  /* Add initial history entry */
  await addHistoryEntry(goal.id, 'milestone_created', 'Goal created', null)

  return goal
  })
}

/**
 * Update an existing goal. Adds history entry if progress changes.
 */
export async function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
  return withGoalsCacheInvalidation(async () => {
  /* Fetch existing goal to check for progress changes */
  const { data: existing, error: fetchError } = await supabase
    .from('goals')
    .select('progress')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching goal for update:', fetchError)
    throw fetchError
  }

  const oldProgress = (existing as Goal).progress
  const newProgress = input.progress ?? oldProgress

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.start_date !== undefined) updateData.start_date = input.start_date ?? null
  if (input.target_date !== undefined) updateData.target_date = input.target_date ?? null
  if (input.progress !== undefined) updateData.progress = input.progress
   /* Allow toggling active/inactive state */
  if (input.is_active !== undefined) updateData.is_active = input.is_active
  if (input.icon_name !== undefined) updateData.icon_name = input.icon_name ?? 'potted_plant'
  if (input.category !== undefined) updateData.category = input.category ?? null

  const { data, error } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating goal:', error)
    throw error
  }

  /* Add history entry if progress changed */
  if (oldProgress !== newProgress) {
    await addHistoryEntry(
      id,
      'progress_change',
      `Progress changed from ${oldProgress}% to ${newProgress}%`,
      { old_progress: oldProgress, new_progress: newProgress },
    )
  }

  return data as Goal
  })
}

/**
 * Delete a goal (cascades to milestones, history, and habit links).
 */
export async function deleteGoal(id: string): Promise<void> {
  return withGoalsCacheInvalidation(async () => {
  const { error } = await supabase.from('goals').delete().eq('id', id)

  if (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
  })
}

/**
 * Fetch milestones for a goal.
 */
export async function getMilestonesForGoal(goalId: string): Promise<GoalMilestone[]> {
  const grouped = await getMilestonesByGoalIds([goalId])
  return grouped[goalId] ?? []
}

/**
 * Fetch milestones for multiple goals in one query, grouped by goal_id.
 */
export async function getMilestonesByGoalIds(
  goalIds: string[],
): Promise<Record<string, GoalMilestone[]>> {
  if (goalIds.length === 0) {
    return {}
  }

  return cachedQuery(buildMilestonesByGoalIdsCacheKey(goalIds), () =>
    fetchMilestonesByGoalIdsUncached(goalIds),
  )
}

/** Uncached batched milestone fetch grouped by goal_id */
async function fetchMilestonesByGoalIdsUncached(
  goalIds: string[],
): Promise<Record<string, GoalMilestone[]>> {
  const byGoal: Record<string, GoalMilestone[]> = {}
  for (const id of goalIds) {
    byGoal[id] = []
  }

  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .in('goal_id', goalIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching milestones by goal ids:', error)
    throw error
  }

  for (const row of (data ?? []) as GoalMilestone[]) {
    if (!byGoal[row.goal_id]) {
      byGoal[row.goal_id] = []
    }
    byGoal[row.goal_id].push(row)
  }

  return byGoal
}

/**
 * Create a milestone and add history entry.
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<GoalMilestone> {
  return withGoalsCacheInvalidation(async () => {
  if (input.type === 'task' && (!input.task_ids || input.task_ids.length === 0)) {
    throw new Error('Task milestones require at least one linked task')
  }

  const insertData: Record<string, unknown> = {
    goal_id: input.goal_id,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    start_value: input.start_value ?? null,
    target_value: input.target_value ?? null,
    unit: input.unit ?? null,
    current_value: input.current_value ?? null,
    completed: input.completed ?? false,
    sort_order: input.sort_order ?? 0,
  }

  const { data, error } = await supabase
    .from('goal_milestones')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating milestone:', error)
    throw error
  }

  const milestone = data as GoalMilestone

  /* Link tasks for task-type milestones */
  if (input.type === 'task' && input.task_ids && input.task_ids.length > 0) {
    await syncMilestoneTaskLinks(milestone.id, input.task_ids)
  }

  /* Add history entry */
  /* History: record milestone type and starting numbers when relevant */
  const createdMeta: Record<string, unknown> = {
    milestone_id: milestone.id,
    milestone_type: input.type,
    milestone_title: input.title,
  }
  if (input.type === 'number') {
    createdMeta.start_value = input.start_value ?? null
    createdMeta.target_value = input.target_value ?? null
    createdMeta.current_value = input.current_value ?? null
    createdMeta.unit = input.unit ?? null
  }
  if (input.type === 'task' && input.task_ids) {
    createdMeta.task_ids = input.task_ids
  }
  if (input.description) {
    createdMeta.description = input.description
  }
  await addHistoryEntry(
    input.goal_id,
    'milestone_created',
    `Milestone "${input.title}" added (${input.type}${input.type === 'number' && input.target_value != null ? ` · target ${formatMilestoneQuantity(input.target_value)}${input.unit ? ` ${input.unit}` : ''}` : ''})`,
    createdMeta,
  )

  /* Recalculate and update goal progress */
  await recalculateGoalProgress(input.goal_id)

  return milestone
  })
}

/**
 * Update a milestone. Adds timestamped history with field-level detail and recalculates goal progress.
 */
export async function updateMilestone(
  id: string,
  input: UpdateMilestoneInput,
): Promise<GoalMilestone> {
  return withGoalsCacheInvalidation(async () => {
  /* Load full milestone so we can diff before/after for history */
  const { data: existing, error: fetchError } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching milestone for update:', fetchError)
    throw fetchError ?? new Error('Milestone not found')
  }

  const prev = existing as GoalMilestone
  const wasCompleted = prev.completed
  const isNowCompleted = input.completed ?? wasCompleted

  const prevTaskIdsMap = await getMilestoneTaskIdsByMilestoneId([id])
  const prevTaskIds = prevTaskIdsMap[id] ?? []

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.start_value !== undefined) updateData.start_value = input.start_value
  if (input.target_value !== undefined) updateData.target_value = input.target_value
  if (input.unit !== undefined) updateData.unit = input.unit
  if (input.current_value !== undefined) updateData.current_value = input.current_value
  if (input.completed !== undefined) updateData.completed = input.completed
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order

  const willSyncTasks = input.task_ids !== undefined
  const hasMilestoneFieldUpdates = Object.keys(updateData).length > 0

  /* No-op updates: skip DB write and history */
  if (!hasMilestoneFieldUpdates && !willSyncTasks) {
    return { ...prev, linked_tasks: [] }
  }

  let next = prev

  if (hasMilestoneFieldUpdates) {
    const { data, error } = await supabase
      .from('goal_milestones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating milestone:', error)
      throw error
    }

    next = data as GoalMilestone
  }

  if (willSyncTasks) {
    if (prev.type === 'task' && input.task_ids && input.task_ids.length === 0) {
      throw new Error('Task milestones require at least one linked task')
    }
    await syncMilestoneTaskLinks(id, input.task_ids ?? [])
  }

  const nextTaskIdsMap = await getMilestoneTaskIdsByMilestoneId([id])
  const nextTaskIds = nextTaskIdsMap[id] ?? []

  /* History: completion-only edits get one rich line; otherwise log field-level updates */
  const onlyCompleted = isOnlyCompletionTransition(prev, next, prevTaskIds, nextTaskIds)

  if (onlyCompleted) {
    await addHistoryEntry(
      next.goal_id,
      'milestone_completed',
      describeMilestoneCompletedAlone(next),
      {
        milestone_id: next.id,
        milestone_type: next.type,
        milestone_title: next.title,
        event: 'completed',
      },
    )
  } else {
    const { description, metadata } = await describeMilestoneChanges(
      prev,
      next,
      prevTaskIds,
      nextTaskIds,
    )
    await addHistoryEntry(next.goal_id, 'milestone_updated', description, metadata)

    /* Separate completion line when other fields also changed */
    if (!wasCompleted && isNowCompleted) {
      await addHistoryEntry(
        next.goal_id,
        'milestone_completed',
        `Milestone "${next.title}" marked complete`,
        {
          milestone_id: next.id,
          milestone_type: next.type,
          milestone_title: next.title,
          event: 'completed',
        },
      )
    }
  }

  /* Recalculate and update goal progress */
  await recalculateGoalProgress(next.goal_id)

  return next
  })
}

/**
 * Delete a milestone, add history entry, and recalculate goal progress.
 */
export async function deleteMilestone(id: string): Promise<void> {
  return withGoalsCacheInvalidation(async () => {
  /* Fetch full milestone for goal_id, title, and type in history */
  const { data: existing, error: fetchError } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching milestone for deletion:', fetchError)
    throw fetchError ?? new Error('Milestone not found')
  }

  const milestone = existing as GoalMilestone

  const { error } = await supabase.from('goal_milestones').delete().eq('id', id)

  if (error) {
    console.error('Error deleting milestone:', error)
    throw error
  }

  /* History: record removal with milestone context */
  await addHistoryEntry(
    milestone.goal_id,
    'milestone_updated',
    `Milestone "${milestone.title}" removed (${milestone.type})`,
    {
      milestone_id: id,
      milestone_type: milestone.type,
      milestone_title: milestone.title,
      event: 'deleted',
    },
  )

  /* Recalculate and update goal progress */
  await recalculateGoalProgress(milestone.goal_id)
  })
}

/**
 * Fetch the first goal id linked to a habit (habits typically link to one goal in the modal).
 */
export async function getLinkedGoalIdForHabit(habitId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('goal_habits')
    .select('goal_id')
    .eq('habit_id', habitId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching linked goal for habit:', error)
    throw error
  }

  return data ? (data as { goal_id: string }).goal_id : null
}

/**
 * Link a habit to a goal and add history entry.
 */
export async function linkHabitToGoal(goalId: string, habitId: string): Promise<void> {
  return withGoalsCacheInvalidation(async () => {
  const { error } = await supabase
    .from('goal_habits')
    .insert({ goal_id: goalId, habit_id: habitId })

  if (error) {
    /* Ignore unique constraint violation (habit already linked) */
    if (error.code !== '23505') {
      console.error('Error linking habit to goal:', error)
      throw error
    }
    return
  }

  /* Fetch habit name for history entry */
  const { data: habitData } = await supabase
    .from('habits')
    .select('name')
    .eq('id', habitId)
    .single()

  const habitName = habitData ? (habitData as { name: string }).name : 'Unknown'

  await addHistoryEntry(
    goalId,
    'habit_linked',
    `Habit "${habitName}" linked to goal`,
    { habit_id: habitId },
  )
  })
}

/**
 * Unlink a habit from a goal and add history entry.
 */
export async function unlinkHabitFromGoal(goalId: string, habitId: string): Promise<void> {
  return withGoalsCacheInvalidation(async () => {
  /* Fetch habit name before unlinking */
  const { data: habitData } = await supabase
    .from('habits')
    .select('name')
    .eq('id', habitId)
    .single()

  const habitName = habitData ? (habitData as { name: string }).name : 'Unknown'

  const { error } = await supabase
    .from('goal_habits')
    .delete()
    .eq('goal_id', goalId)
    .eq('habit_id', habitId)

  if (error) {
    console.error('Error unlinking habit from goal:', error)
    throw error
  }

  await addHistoryEntry(
    goalId,
    'habit_unlinked',
    `Habit "${habitName}" unlinked from goal`,
    { habit_id: habitId },
  )
  })
}

/**
 * Count milestone_completed goal_history rows in a UTC range for the current user's goals.
 */
export async function getMilestoneCompletionsInRange(
  startISO: string,
  endISO: string,
): Promise<number> {
  const goals = await getGoals()
  if (goals.length === 0) return 0

  const goalIds = goals.map((g) => g.id)
  const { data, error } = await supabase
    .from('goal_history')
    .select('id')
    .in('goal_id', goalIds)
    .eq('event_type', 'milestone_completed')
    .gte('created_at', startISO)
    .lt('created_at', endISO)

  if (error) {
    console.error('Error fetching milestone completions in range:', error)
    return 0
  }

  return (data ?? []).length
}

/**
 * Fetch goal history entries ordered by created_at descending.
 */
export async function getGoalHistory(goalId: string): Promise<GoalHistory[]> {
  const { data, error } = await supabase
    .from('goal_history')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goal history:', error)
    throw error
  }

  return (data ?? []) as GoalHistory[]
}

/**
 * Calculate goal progress from milestones and update goal.progress.
 * Uses equal weight average of each milestone’s 0–100% contribution.
 */
export async function calculateGoalProgress(goalId: string): Promise<number> {
  const milestones = await getMilestonesForGoal(goalId)
  const progress = await calculateProgressFromMilestones(milestones)

  /* Update goal progress */
  await updateGoal(goalId, { progress })

  return progress
}

/**
 * Recalculate goal progress (internal helper).
 */
async function recalculateGoalProgress(goalId: string): Promise<void> {
  await calculateGoalProgress(goalId)
}

/**
 * Add a history entry (internal helper).
 */
async function addHistoryEntry(
  goalId: string,
  eventType: GoalHistory['event_type'],
  description: string | null,
  metadata: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase.from('goal_history').insert({
    goal_id: goalId,
    event_type: eventType,
    description,
    metadata,
  })

  if (error) {
    console.error('Error adding history entry:', error)
    /* Don't throw - history is non-critical */
  }
}
