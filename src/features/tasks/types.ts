/* Task types: TypeScript definitions for task and subtask entities */

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'active' | 'completed'

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: TaskPriority
  category: string | null
  status: TaskStatus
  recurrence_pattern: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  created_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  due_date?: string | null
  priority?: TaskPriority
  category?: string | null
  recurrence_pattern?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  due_date?: string | null
  priority?: TaskPriority
  category?: string | null
  status?: TaskStatus
  recurrence_pattern?: string | null
}

export interface CreateSubtaskInput {
  task_id: string
  title: string
}

export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  category?: string | 'all'
  search?: string
  dueDateFilter?: 'overdue' | 'today' | 'upcoming' | 'no-date' | 'all'
}
