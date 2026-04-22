/* Task data access layer: Supabase queries for CRUD on tasks, checklists, and dependencies */
import { DateTime } from 'luxon'
import { supabase } from './client'
import { getTagsForTask } from './tags'
import { parseRecurrencePattern, getNextOccurrence } from '../recurrence'
import type {
  Task,
  Tag,
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

/** Raw task row with embedded task_tags from Supabase select */
interface TaskRowWithTags {
  task_tags?: { tag_id: string; tags: Tag | null }[]
  [key: string]: unknown
}

/**
 * Fetch all tasks with optional filters.
 * When parent_id filter is set, returns only subtasks of that parent.
 * Joins task_tags and tags to populate task.tags.
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*, task_tags(tag_id, tags(*))')
    .order('created_at', { ascending: false })

  /* Filter by parent: null = top-level tasks, specific parent for subtasks, or skip when includeAllTasks */
  if (filters?.includeAllTasks) {
    /* No parent filter: fetch all tasks for dependency linking */
  } else if (filters?.parent_id !== undefined) {
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

  /* Completed-at range: when status is completed and both bounds set, filter by completed_at */
  if (
    filters?.status === 'completed' &&
    filters?.completedAtFrom &&
    filters?.completedAtTo
  ) {
    query = query
      .gte('completed_at', filters.completedAtFrom)
      .lte('completed_at', filters.completedAtTo)
  }

  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  /* Tag filter applied after fetch (filter by task.tags including tag name) */

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    )
  }

  if (filters?.dueDateFilter && filters.dueDateFilter !== 'all') {
    /* Due-date presets: use profile time zone when provided so "today" matches Settings / task list */
    let rangeStartIso: string
    let rangeEndIso: string
    if (filters.timeZone) {
      const nowZ = DateTime.now().setZone(filters.timeZone)
      rangeStartIso = nowZ.startOf('day').toUTC().toISO()!
      rangeEndIso = nowZ.endOf('day').toUTC().toISO()!
    } else {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)
      rangeStartIso = todayStart.toISOString()
      rangeEndIso = todayEnd.toISOString()
    }

    switch (filters.dueDateFilter) {
      case 'overdue':
        query = query
          .lt('due_date', rangeStartIso)
          .not('due_date', 'is', null)
        break
      case 'today':
        query = query
          .gte('due_date', rangeStartIso)
          .lte('due_date', rangeEndIso)
        break
      case 'upcoming':
        query = query.gt('due_date', rangeEndIso)
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

  /* Normalize: extract tags from task_tags, ensure attachments array, apply tag filter */
  let tasks = ((data as TaskRowWithTags[]) ?? []).map((t) => {
    const taskTags = t.task_tags ?? []
    const tags: Tag[] = taskTags
      .map((tt) => tt.tags)
      .filter((tag): tag is Tag => tag != null)
    const { task_tags: _tt, ...rest } = t
    return {
      ...rest,
      habit_id: (rest as { habit_id?: string | null }).habit_id ?? null,
      tags,
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
    } as Task
  })

  if (filters?.tag && filters.tag !== 'all') {
    tasks = tasks.filter((t) => t.tags.some((tag) => tag.name === filters.tag))
  }

  return tasks
}

/**
 * Fetch tasks by a list of IDs (for goal milestones). Returns tasks with tags and attachments.
 */
export async function getTasksByIds(ids: string[]): Promise<Task[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_tags(tag_id, tags(*))')
    .in('id', ids)

  if (error) {
    console.error('Error fetching tasks by ids:', error)
    throw error
  }

  const tasks = ((data as TaskRowWithTags[]) ?? []).map((t) => {
    const taskTags = t.task_tags ?? []
    const tags: Tag[] = taskTags
      .map((tt) => tt.tags)
      .filter((tag): tag is Tag => tag != null)
    const { task_tags: _tt, ...rest } = t
    return {
      ...rest,
      habit_id: (rest as { habit_id?: string | null }).habit_id ?? null,
      tags,
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
    } as Task
  })

  return tasks
}

/**
 * Fetch the single task linked to a habit (habit_id is unique when set).
 */
export async function getTaskByHabitId(habitId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_tags(tag_id, tags(*))')
    .eq('habit_id', habitId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching task by habit_id:', error)
    throw error
  }
  if (!data) return null

  const t = data as TaskRowWithTags
  const taskTags = t.task_tags ?? []
  const tags: Tag[] = taskTags
    .map((tt) => tt.tags)
    .filter((tag): tag is Tag => tag != null)
  const { task_tags: _tt, ...rest } = t
  return {
    ...rest,
    habit_id: (rest as { habit_id?: string | null }).habit_id ?? null,
    tags,
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
  } as Task
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
    time_estimate: input.time_estimate ?? null,
    attachments: input.attachments ?? [],
    parent_id: input.parent_id ?? null,
    goal_id: input.goal_id ?? null,
    habit_id: input.habit_id ?? null,
    recurrence_pattern: input.recurrence_pattern ?? null,
    status: input.status ?? 'active',
  }
  if (input.user_id !== undefined) {
    insertData.user_id = input.user_id
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

  const task = data as Record<string, unknown>
  return {
    ...task,
    tags: [],
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
  } as unknown as Task
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
  if (input.time_estimate !== undefined) updateData.time_estimate = input.time_estimate
  if (input.attachments !== undefined) updateData.attachments = input.attachments
  if (input.status !== undefined) {
    updateData.status = input.status
    /* Keep completed_at in sync: only completed status has completed_at set */
    updateData.completed_at = input.status === 'completed' ? new Date().toISOString() : null
  }
  if (input.category !== undefined) updateData.category = input.category
  if (input.goal_id !== undefined) updateData.goal_id = input.goal_id
  if (input.recurrence_pattern !== undefined)
    updateData.recurrence_pattern = input.recurrence_pattern
  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id

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
  /* Refetch with tags to return full task */
  const tags = await getTagsForTask(id)
  return {
    ...task,
    tags,
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

/** Parse YYYY-MM-DD or ISO string to date-only for recurrence (timezone-safe) */
function toDateOnly(iso: string | null): string | null {
  if (!iso) return null
  // If it's already a plain date string, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  // If it starts with a date portion (e.g. 2026-03-10T00:00:00+00:00), slice the first 10 chars
  const prefix = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return prefix
  // Fallback: use Date, but this should rarely be needed
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add days to YYYY-MM-DD, return YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Get today's date as YYYY-MM-DD in local time (civil date). */
function todayLocalYMD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Toggle task completion status.
 * When completing a recurring task: advance dates, set status back to active, optionally reopen checklist items.
 */
export async function toggleTaskComplete(id: string, completed: boolean): Promise<Task> {
  if (!completed) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'active', completed_at: null })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('Error toggling task completion:', error)
      throw error
    }
    const task = data as Task
    const tags = await getTagsForTask(id)
    return { ...task, tags, attachments: Array.isArray(task.attachments) ? task.attachments : [] }
  }

  /* Fetch task to check recurrence */
  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching task:', fetchError)
    throw fetchError ?? new Error('Task not found')
  }

  const task = existing as Task
  const pattern = parseRecurrencePattern(task.recurrence_pattern)

  if (!pattern) {
    /* Non-recurring: mark completed */
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('Error toggling task completion:', error)
      throw error
    }
    const updated = data as Task
    const tags = await getTagsForTask(id)
    return { ...updated, tags, attachments: Array.isArray(updated.attachments) ? updated.attachments : [] }
  }

  /* Recurring: advance dates and set status=active.
   * Anchor on due_date when present; otherwise fall back to start_date so
   * recurring tasks with only a start date still advance like reminders.
   */
  const completionYMD = todayLocalYMD()
  const anchorMode = (pattern as unknown as { anchor?: 'due' | 'completion' }).anchor ?? 'due'
  const baseAnchorYMD =
    anchorMode === 'completion'
      ? completionYMD
      : toDateOnly(task.due_date ?? task.start_date)

  const anchorYMD = baseAnchorYMD
  if (!anchorYMD) {
    /* No anchor date at all: just mark completed (fallback) */
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const updated = data as Task
    const tags = await getTagsForTask(id)
    return { ...updated, tags, attachments: Array.isArray(updated.attachments) ? updated.attachments : [] }
  }

  /* Compute next occurrence; if overdue past multiple intervals, advance until we reach a future date (Todoist-style). */
  let nextDueYMD = getNextOccurrence(pattern, anchorYMD)
  let guard = 0
  while (nextDueYMD && nextDueYMD <= completionYMD && guard < 400) {
    nextDueYMD = getNextOccurrence(pattern, nextDueYMD)
    guard += 1
  }

  if (!nextDueYMD) {
    /* No next occurrence (e.g. past until): mark completed */
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const updated = data as Task
    const tags = await getTagsForTask(id)
    return { ...updated, tags, attachments: Array.isArray(updated.attachments) ? updated.attachments : [] }
  }

  /* Compute start offset: days from start to due (or 0 when only start exists) */
  const startYMD = toDateOnly(task.start_date)
  let nextStartYMD: string | null = null
  if (startYMD) {
    let offsetDays = 0
    const dueYMD = toDateOnly(task.due_date ?? task.start_date)
    if (dueYMD && task.due_date) {
      const startDate = new Date(startYMD + 'T12:00:00')
      const dueDate = new Date(dueYMD + 'T12:00:00')
      offsetDays = Math.round((dueDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    }
    nextStartYMD = addDays(nextDueYMD, -offsetDays)
  }

  const updateData: Record<string, unknown> = {
    status: 'active',
    completed_at: null,
    due_date: nextDueYMD,
    start_date: nextStartYMD,
  }
  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error advancing recurring task:', error)
    throw error
  }

  /* Reopen checklist items if option is set */
  if (pattern.reopenChecklist) {
    const checklists = await getTaskChecklists(id)
    for (const cl of checklists) {
      const items = await getTaskChecklistItems(cl.id)
      for (const item of items) {
        if (item.completed) {
          await toggleChecklistItemComplete(item.id, false)
        }
      }
    }
  }

  const updated = data as Task
  const tags = await getTagsForTask(id)
  return { ...updated, tags, attachments: Array.isArray(updated.attachments) ? updated.attachments : [] }
}

/**
 * Fetch subtasks of a task (tasks with parent_id = taskId).
 * Joins task_tags and tags to populate task.tags.
 */
export async function getSubtasks(taskId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_tags(tag_id, tags(*))')
    .eq('parent_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching subtasks:', error)
    throw error
  }

  return ((data as TaskRowWithTags[]) ?? []).map((t) => {
    const taskTags = t.task_tags ?? []
    const tags: Tag[] = taskTags
      .map((tt) => tt.tags)
      .filter((tag): tag is Tag => tag != null)
    const { task_tags: _tt, ...rest } = t
    return {
      ...rest,
      tags,
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
    } as Task
  })
}

/**
 * Linked task plus all descendant subtasks (recursive), for goal milestone progress.
 */
export async function getTaskTreeForProgress(rootTaskId: string): Promise<Task[]> {
  const roots = await getTasksByIds([rootTaskId])
  const root = roots[0]
  if (!root) return []

  const out: Task[] = [root]

  /* Depth-first walk: each subtask may have its own subtasks */
  async function walk(parentId: string): Promise<void> {
    const subs = await getSubtasks(parentId)
    for (const s of subs) {
      out.push(s)
      await walk(s.id)
    }
  }

  await walk(rootTaskId)
  return out
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
 * Update a checklist (e.g. rename title)
 */
export async function updateTaskChecklist(
  id: string,
  updates: { title?: string; sort_order?: number },
): Promise<TaskChecklist> {
  const { data, error } = await supabase
    .from('task_checklists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating checklist:', error)
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
 * Delete a checklist (and, via DB constraints, its items) by id.
 */
export async function deleteTaskChecklist(id: string): Promise<void> {
  const { error } = await supabase.from('task_checklists').delete().eq('id', id)

  if (error) {
    console.error('Error deleting checklist:', error)
    throw error
  }
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
 * Update a checklist item (e.g. rename title or adjust sort_order).
 */
export async function updateChecklistItem(
  id: string,
  updates: { title?: string; sort_order?: number },
): Promise<TaskChecklistItem> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating checklist item:', error)
    throw error
  }

  return data as TaskChecklistItem
}

/**
 * Delete a checklist item by id.
 */
export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('task_checklist_items').delete().eq('id', id)

  if (error) {
    console.error('Error deleting checklist item:', error)
    throw error
  }
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
 * Delete a task dependency by id
 */
export async function deleteTaskDependency(dependencyId: string): Promise<void> {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)

  if (error) {
    console.error('Error deleting task dependency:', error)
    throw error
  }
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

/**
 * Fetch all dependencies where blocked_id is in the given task IDs (for bulk "is blocked" check).
 * Returns list of { blocked_id, blocker_id }. Caller can compute blocked set using task statuses.
 */
export async function getDependenciesForTaskIds(blockedIds: string[]): Promise<
  { blocked_id: string; blocker_id: string }[]
> {
  if (blockedIds.length === 0) return []
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('blocked_id, blocker_id')
    .in('blocked_id', blockedIds)
  if (error) {
    console.error('Error fetching dependencies for task ids:', error)
    throw error
  }
  return (data as { blocked_id: string; blocker_id: string }[]) ?? []
}
