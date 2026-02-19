/* Goal data access layer: Supabase CRUD for goals, milestones, habit links, and history */
import { supabase } from './client'
import { getTasksByIds } from './tasks'
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

/**
 * Fetch all goals ordered by created_at descending.
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

  /* Calculate progress from milestones (equal weight) */
  const computed_progress = calculateProgressFromMilestones(milestones)

  return {
    ...goal,
    milestones: milestonesWithTasks,
    linked_habits,
    computed_progress,
  }
}

/**
 * Calculate goal progress from milestones (equal weight).
 * Returns percentage (0-100) based on completed milestones.
 */
function calculateProgressFromMilestones(milestones: GoalMilestone[]): number {
  if (milestones.length === 0) return 0

  const completed = milestones.filter((m) => {
    if (m.type === 'task') {
      /* Task milestone: check if linked task is completed (requires task lookup) */
      /* For now, assume task completion is checked elsewhere and milestone.completed is updated */
      return m.completed
    } else if (m.type === 'number') {
      /* Number milestone: completed when current_value >= target_value */
      return (
        m.current_value != null &&
        m.target_value != null &&
        m.current_value >= m.target_value
      )
    } else {
      /* Boolean milestone: completed when completed = true */
      return m.completed
    }
  }).length

  return Math.round((completed / milestones.length) * 100)
}

/**
 * Create a new goal and add initial history entry.
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const insertData: Record<string, unknown> = {
    user_id: input.user_id ?? null,
    name: input.name,
    description: input.description ?? null,
    start_date: input.start_date,
    target_date: input.target_date,
    progress: input.progress ?? 0,
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
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.target_date !== undefined) updateData.target_date = input.target_date
  if (input.progress !== undefined) updateData.progress = input.progress

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
  await addHistoryEntry(
    input.goal_id,
    'milestone_created',
    `Milestone "${input.title}" created`,
    { milestone_id: milestone.id, milestone_type: input.type },
  )

  /* Recalculate and update goal progress */
  await recalculateGoalProgress(input.goal_id)

  return milestone
}

/**
 * Update a milestone. Adds history entry and recalculates goal progress.
 */
export async function updateMilestone(
  id: string,
  input: UpdateMilestoneInput,
): Promise<GoalMilestone> {
  /* Fetch existing milestone to get goal_id */
  const { data: existing, error: fetchError } = await supabase
    .from('goal_milestones')
    .select('goal_id, title, completed')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching milestone for update:', fetchError)
    throw fetchError ?? new Error('Milestone not found')
  }

  const milestone = existing as GoalMilestone
  const wasCompleted = milestone.completed
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

  const updated = data as GoalMilestone

  /* Add history entry */
  await addHistoryEntry(
    milestone.goal_id,
    'milestone_updated',
    `Milestone "${updated.title}" updated`,
    { milestone_id: id },
  )

  /* If milestone was just completed, add completion history entry */
  if (!wasCompleted && isNowCompleted) {
    await addHistoryEntry(
      milestone.goal_id,
      'milestone_completed',
      `Milestone "${updated.title}" completed`,
      { milestone_id: id },
    )
  }

  /* Recalculate and update goal progress */
  await recalculateGoalProgress(milestone.goal_id)

  return updated
}

/**
 * Delete a milestone, add history entry, and recalculate goal progress.
 */
export async function deleteMilestone(id: string): Promise<void> {
  /* Fetch milestone to get goal_id and title before deletion */
  const { data: existing, error: fetchError } = await supabase
    .from('goal_milestones')
    .select('goal_id, title')
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

  /* Add history entry */
  await addHistoryEntry(
    milestone.goal_id,
    'milestone_updated',
    `Milestone "${milestone.title}" deleted`,
    { milestone_id: id },
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
 * Uses equal weight: (completed_milestones / total_milestones) * 100
 */
export async function calculateGoalProgress(goalId: string): Promise<number> {
  const milestones = await getMilestonesForGoal(goalId)
  const progress = calculateProgressFromMilestones(milestones)

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
