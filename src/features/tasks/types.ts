/* Task types: TypeScript definitions for task entities, checklists, and dependencies */

/**
 * Task priority. Display: none = black stroke/white fill, low = grey, medium = "normal" = blue,
 * high = yellow, urgent = red. DB may only persist low/medium/high; none/urgent supported in UI.
 */
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

/**
 * Task status. UI mapping: active → OPEN, in_progress → IN PROGRESS, completed → COMPLETE.
 * archived and deleted are hidden by default; shown when "Show archived" / "Show deleted" toggles are on.
 */
export type TaskStatus = 'active' | 'in_progress' | 'completed' | 'archived' | 'deleted'

/** Attachment stored as JSONB in tasks.attachments */
export interface TaskAttachment {
  url: string
  name?: string
  type?: string
}

/** Checklist item within a task checklist */
export interface TaskChecklistItem {
  id: string
  checklist_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

/** Checklist containing items; belongs to a task */
export interface TaskChecklist {
  id: string
  task_id: string
  title: string
  sort_order: number
  created_at: string
  items?: TaskChecklistItem[]
}

/** Task dependency: blocker must be completed before blocked can start */
export interface TaskDependency {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

/** Tag color id - maps to Tailwind classes (mint, blue, lavender, yellow, periwinkle, slate) */
export type TagColorId = 'slate' | 'mint' | 'blue' | 'lavender' | 'yellow' | 'periwinkle'

/** Tag entity - reusable label with color, linked to tasks via task_tags */
export interface Tag {
  id: string
  name: string
  color: TagColorId
  user_id: string | null
  created_at?: string
}

/** Main task entity - subtasks are tasks with parent_id set */
export interface Task {
  id: string
  user_id: string | null
  parent_id: string | null
  goal_id: string | null
  title: string
  description: string | null
  start_date: string | null
  due_date: string | null
  priority: TaskPriority
  tags: Tag[]
  time_estimate: number | null
  attachments: TaskAttachment[]
  category: string | null
  status: TaskStatus
  recurrence_pattern: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** Input for creating a new task (all optional except title). Tags are assigned via addTagToTask after create. */
export interface CreateTaskInput {
  title: string
  user_id?: string | null
  parent_id?: string | null
  goal_id?: string | null
  description?: string | null
  start_date?: string | null
  due_date?: string | null
  priority?: TaskPriority
  time_estimate?: number | null
  attachments?: TaskAttachment[]
  status?: TaskStatus
  recurrence_pattern?: string | null
}

/** Input for updating an existing task (all optional). Tags are managed via addTagToTask/removeTagFromTask. */
export interface UpdateTaskInput {
  title?: string
  description?: string | null
  start_date?: string | null
  due_date?: string | null
  priority?: TaskPriority
  time_estimate?: number | null
  attachments?: TaskAttachment[]
  status?: TaskStatus
  category?: string | null
  goal_id?: string | null
  recurrence_pattern?: string | null
}

/** Input for creating a checklist on a task */
export interface CreateTaskChecklistInput {
  task_id: string
  title: string
  sort_order?: number
}

/** Input for creating a checklist item */
export interface CreateChecklistItemInput {
  checklist_id: string
  title: string
  sort_order?: number
}

/** Input for creating a task dependency (blocker blocks blocked) */
export interface CreateTaskDependencyInput {
  blocker_id: string
  blocked_id: string
}

export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  category?: string | 'all'
  tag?: string | 'all'
  search?: string
  dueDateFilter?: 'overdue' | 'today' | 'upcoming' | 'no-date' | 'all'
  parent_id?: string | null
  /** When true, fetch all tasks (including subtasks) for dependency linking */
  includeAllTasks?: boolean
  /** Filter completed tasks by completed_at range (ISO strings); used with status: 'completed' */
  completedAtFrom?: string
  completedAtTo?: string
}

/** Sort field ids for the sort modal (tasks only) */
export type SortFieldId =
  | 'start_date'
  | 'due_date'
  | 'priority'
  | 'time_estimate'
  | 'status'
  | 'task_name'

/** One sort level: field and direction */
export interface SortByEntry {
  field: SortFieldId
  direction: 'asc' | 'desc'
}
