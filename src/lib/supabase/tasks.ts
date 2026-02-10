/* Task data access layer: Supabase queries for CRUD operations on tasks and subtasks */
import { supabase } from './client'
import type {
  Task,
  Subtask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  TaskFilters,
} from '../../features/tasks/types'

/**
 * Fetch all tasks with optional filters
 * Supports filtering by status, priority, category, search query, and due date
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Apply priority filter
  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }

  // Apply category filter
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  // Apply search filter (searches title and description)
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  // Apply due date filter
  if (filters?.dueDateFilter && filters.dueDateFilter !== 'all') {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const todayEnd = new Date(now.setHours(23, 59, 59, 999))

    switch (filters.dueDateFilter) {
      case 'overdue':
        query = query.lt('due_date', todayStart.toISOString()).not('due_date', 'is', null)
        break
      case 'today':
        query = query
          .gte('due_date', todayStart.toISOString())
          .lte('due_date', todayEnd.toISOString())
        break
      case 'upcoming':
        query = query.gt('due_date', todayEnd.toISOString())
        break
      case 'no-date':
        query = query.is('due_date', null)
        break
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tasks:', error)
    throw error
  }

  return (data as Task[]) ?? []
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      priority: input.priority ?? 'medium',
      category: input.category ?? null,
      recurrence_pattern: input.recurrence_pattern ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    throw error
  }

  return data as Task
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const updateData: Partial<UpdateTaskInput> = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.due_date !== undefined) updateData.due_date = input.due_date
  if (input.priority !== undefined) updateData.priority = input.priority
  if (input.category !== undefined) updateData.category = input.category
  if (input.status !== undefined) updateData.status = input.status
  if (input.recurrence_pattern !== undefined)
    updateData.recurrence_pattern = input.recurrence_pattern

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    throw error
  }

  return data as Task
}

/**
 * Delete a task (cascades to subtasks)
 */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
    throw error
  }
}

/**
 * Toggle task completion status
 */
export async function toggleTaskComplete(id: string, completed: boolean): Promise<Task> {
  const updateData: UpdateTaskInput & { completed_at?: string | null } = {
    status: completed ? 'completed' : 'active',
  }

  if (completed) {
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error toggling task completion:', error)
    throw error
  }

  return data as Task
}

/**
 * Fetch all subtasks for a given task
 */
export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching subtasks:', error)
    throw error
  }

  return (data as Subtask[]) ?? []
}

/**
 * Create a new subtask
 */
export async function createSubtask(input: CreateSubtaskInput): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: input.task_id,
      title: input.title,
      completed: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating subtask:', error)
    throw error
  }

  return data as Subtask
}

/**
 * Update a subtask
 */
export async function updateSubtask(
  id: string,
  updates: Partial<Pick<Subtask, 'title' | 'completed'>>,
): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating subtask:', error)
    throw error
  }

  return data as Subtask
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from('subtasks').delete().eq('id', id)

  if (error) {
    console.error('Error deleting subtask:', error)
    throw error
  }
}

/**
 * Toggle subtask completion status
 */
export async function toggleSubtaskComplete(id: string, completed: boolean): Promise<Subtask> {
  return updateSubtask(id, { completed })
}
