/* Goal data access layer: Supabase CRUD for goals, milestones, habit links, and history */
import { supabase } from './client'
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

/**
 * True when the milestone row changed only by completing (incomplete → complete).
 * In that case we log a single `milestone_completed` entry with detail, not a generic update.
 */
function isOnlyCompletionTransition(prev: GoalMilestone, next: GoalMilestone): boolean {
  if (prev.completed || !next.completed) return false
  return (
    prev.title === next.title &&
    prev.task_id === next.task_id &&
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

  /* Linked task change (task milestones) */
  if (prev.task_id !== next.task_id) {
    const ids = [prev.task_id, next.task_id].filter(Boolean) as string[]
    const tasks = ids.length > 0 ? await getTasksByIds(ids) : []
    const titles = new Map(tasks.map((t) => [t.id, t.title]))
    const prevLabel = prev.task_id ? titles.get(prev.task_id) ?? 'Task' : 'None'
    const nextLabel = next.task_id ? titles.get(next.task_id) ?? 'Task' : 'None'
    parts.push(`linked task "${prevLabel}" → "${nextLabel}"`)
    metadata.previous_task_id = prev.task_id
    metadata.next_task_id = next.task_id
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

  /* Fetch linked tasks for task-type milestones */
  const taskIds = [...new Set(
    milestones.filter((m) => m.type === 'task' && m.task_id).map((m) => m.task_id!)
  )]
  const tasks = taskIds.length > 0 ? await getTasksByIds(taskIds) : []
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]))
  const milestonesWithTasks = milestones.map((m) => ({
    ...m,
    task: m.task_id ? (taskMap.get(m.task_id) ?? null) : null,
  }))

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
  const taskMilestones = milestones.filter((m) => m.type === 'task' && m.task_id)
  const entries = await Promise.all(
    taskMilestones.map(async (m) => {
      const tree = await getTaskTreeForProgress(m.task_id!)
      return [m.id, tree] as const
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
      const tree = m.task_id ? taskTreesByMilestoneId[m.id] ?? [] : []
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
  const insertData: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? null,
    start_date: input.start_date ?? null,
    target_date: input.target_date ?? null,
    progress: input.progress ?? 0,
    is_active: input.is_active ?? true,
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
}

/**
 * Update an existing goal. Adds history entry if progress changes.
 */
export async function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
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
}

/**
 * Delete a goal (cascades to milestones, history, and habit links).
 */
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)

  if (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
}

/**
 * Fetch milestones for a goal.
 */
export async function getMilestonesForGoal(goalId: string): Promise<GoalMilestone[]> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error)
    throw error
  }

  return (data ?? []) as GoalMilestone[]
}

/**
 * Create a milestone and add history entry.
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<GoalMilestone> {
  const insertData: Record<string, unknown> = {
    goal_id: input.goal_id,
    type: input.type,
    title: input.title,
    task_id: input.task_id ?? null,
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
  await addHistoryEntry(
    input.goal_id,
    'milestone_created',
    `Milestone "${input.title}" added (${input.type}${input.type === 'number' && input.target_value != null ? ` · target ${formatMilestoneQuantity(input.target_value)}${input.unit ? ` ${input.unit}` : ''}` : ''})`,
    createdMeta,
  )

  /* Recalculate and update goal progress */
  await recalculateGoalProgress(input.goal_id)

  return milestone
}

/**
 * Update a milestone. Adds timestamped history with field-level detail and recalculates goal progress.
 */
export async function updateMilestone(
  id: string,
  input: UpdateMilestoneInput,
): Promise<GoalMilestone> {
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

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) updateData.title = input.title
  if (input.task_id !== undefined) updateData.task_id = input.task_id
  if (input.start_value !== undefined) updateData.start_value = input.start_value
  if (input.target_value !== undefined) updateData.target_value = input.target_value
  if (input.unit !== undefined) updateData.unit = input.unit
  if (input.current_value !== undefined) updateData.current_value = input.current_value
  if (input.completed !== undefined) updateData.completed = input.completed
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order

  /* No-op updates: skip DB write and history */
  if (Object.keys(updateData).length === 0) {
    return prev
  }

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

  const next = data as GoalMilestone

  /* History: completion-only edits get one rich line; otherwise log field-level updates */
  const onlyCompleted = isOnlyCompletionTransition(prev, next)

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
    const { description, metadata } = await describeMilestoneChanges(prev, next)
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
}

/**
 * Delete a milestone, add history entry, and recalculate goal progress.
 */
export async function deleteMilestone(id: string): Promise<void> {
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
}

/**
 * Link a habit to a goal and add history entry.
 */
export async function linkHabitToGoal(goalId: string, habitId: string): Promise<void> {
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
}

/**
 * Unlink a habit from a goal and add history entry.
 */
export async function unlinkHabitFromGoal(goalId: string, habitId: string): Promise<void> {
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
