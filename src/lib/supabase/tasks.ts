/* Task data access layer: Supabase queries for CRUD on tasks, checklists, and dependencies */
import { supabase } from './client'
import type {
  Task,
  TaskChecklist,
  TaskChecklistItem,
  TaskDependency,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTaskChecklistInput,
  CreateChecklistItemInput,
  CreateTaskDependencyInput,
  TaskFilters,
} from '../../features/tasks/types'

/**
 * Fetch all tasks with optional filters.
 * When parent_id filter is set, returns only subtasks of that parent.
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  /* Filter by parent: null = top-level tasks, or specific parent for subtasks */
  if (filters?.parent_id !== undefined) {
    if (filters.parent_id === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', filters.parent_id)
    }
  } else {
    /* Default: fetch only top-level tasks (no parent) */
    query = query.is('parent_id', null)
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters?.tag && filters.tag !== 'all') {
    query = query.eq('tag', filters.tag)
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    )
  }

  if (filters?.dueDateFilter && filters.dueDateFilter !== 'all') {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    switch (filters.dueDateFilter) {
      case 'overdue':
        query = query
          .lt('due_date', todayStart.toISOString())
          .not('due_date', 'is', null)
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

  /* Normalize attachments: ensure array when JSONB returns null */
  return ((data as Task[]) ?? []).map((t) => ({
    ...t,
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
  }))
}

/**
 * Create a new task.
 * Subtasks: pass parent_id to create as child of another task.
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const insertData: Record<string, unknown> = {
    title: input.title,
    description: input.description ?? null,
    start_date: input.start_date ?? null,
    due_date: input.due_date ?? null,
    priority: input.priority ?? 'medium',
    tag: input.tag ?? null,
    time_estimate: input.time_estimate ?? null,
    attachments: input.attachments ?? [],
    parent_id: input.parent_id ?? null,
    user_id: input.user_id ?? null,
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    throw error
  }

  const task = data as Task
  return {
    ...task,
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
  }
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const updateData: Record<string, unknown> = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.due_date !== undefined) updateData.due_date = input.due_date
  if (input.priority !== undefined) updateData.priority = input.priority
  if (input.tag !== undefined) updateData.tag = input.tag
  if (input.time_estimate !== undefined) updateData.time_estimate = input.time_estimate
  if (input.attachments !== undefined) updateData.attachments = input.attachments
  if (input.status !== undefined) updateData.status = input.status
  if (input.category !== undefined) updateData.category = input.category
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

  const task = data as Task
  return {
    ...task,
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
  }
}

/**
 * Delete a task (cascades to subtasks, checklists, dependencies via DB constraints)
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
  const updateData: Record<string, unknown> = {
    status: completed ? 'completed' : 'active',
    completed_at: completed ? new Date().toISOString() : null,
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

  const task = data as Task
  return {
    ...task,
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
  }
}

/**
 * Fetch subtasks of a task (tasks with parent_id = taskId)
 */
export async function getSubtasks(taskId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching subtasks:', error)
    throw error
  }

  return ((data as Task[]) ?? []).map((t) => ({
    ...t,
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
  }))
}

/**
 * Create a subtask (task with parent_id)
 */
export async function createSubtask(
  parentId: string,
  input: Omit<CreateTaskInput, 'parent_id'>,
): Promise<Task> {
  return createTask({ ...input, parent_id: parentId })
}

/**
 * Create a checklist on a task
 */
export async function createTaskChecklist(
  input: CreateTaskChecklistInput,
): Promise<TaskChecklist> {
  const { data, error } = await supabase
    .from('task_checklists')
    .insert({
      task_id: input.task_id,
      title: input.title,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating checklist:', error)
    throw error
  }

  return data as TaskChecklist
}

/**
 * Fetch all checklists for a task
 */
export async function getTaskChecklists(taskId: string): Promise<TaskChecklist[]> {
  const { data, error } = await supabase
    .from('task_checklists')
    .select('*')
    .eq('task_id', taskId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching checklists:', error)
    throw error
  }

  return (data as TaskChecklist[]) ?? []
}

/**
 * Fetch all items for a checklist
 */
export async function getTaskChecklistItems(
  checklistId: string,
): Promise<TaskChecklistItem[]> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching checklist items:', error)
    throw error
  }

  return (data as TaskChecklistItem[]) ?? []
}

/**
 * Create a checklist item
 */
export async function createChecklistItem(
  input: CreateChecklistItemInput,
): Promise<TaskChecklistItem> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({
      checklist_id: input.checklist_id,
      title: input.title,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating checklist item:', error)
    throw error
  }

  return data as TaskChecklistItem
}

/**
 * Toggle checklist item completion
 */
export async function toggleChecklistItemComplete(
  id: string,
  completed: boolean,
): Promise<TaskChecklistItem> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .update({ completed })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error toggling checklist item:', error)
    throw error
  }

  return data as TaskChecklistItem
}

/**
 * Create a task dependency (blocker blocks blocked)
 */
export async function createTaskDependency(
  input: CreateTaskDependencyInput,
): Promise<TaskDependency> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      blocker_id: input.blocker_id,
      blocked_id: input.blocked_id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task dependency:', error)
    throw error
  }

  return data as TaskDependency
}

/**
 * Fetch blocking and blocked dependencies for a task
 */
export async function getTaskDependencies(taskId: string): Promise<{
  blocking: TaskDependency[]
  blockedBy: TaskDependency[]
}> {
  const { data: blocking } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('blocker_id', taskId)

  const { data: blockedBy } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('blocked_id', taskId)

  return {
    blocking: (blocking as TaskDependency[]) ?? [],
    blockedBy: (blockedBy as TaskDependency[]) ?? [],
  }
}
