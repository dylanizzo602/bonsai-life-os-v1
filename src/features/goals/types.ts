/* Goal types: TypeScript definitions for goals, milestones, history, and related interfaces */
import type { Task } from '../tasks/types'

/** Milestone type: task (linked to task), number (start/target/current with unit), or boolean (true/false) */
export type GoalMilestoneType = 'task' | 'number' | 'boolean'

/** Goal history event type */
export type GoalHistoryEventType =
  | 'progress_change'
  | 'milestone_completed'
  | 'milestone_created'
  | 'milestone_updated'
  | 'habit_linked'
  | 'habit_unlinked'

/** Goal milestone entity: tracks progress via task, number, or boolean */
export interface GoalMilestone {
  id: string
  goal_id: string
  type: GoalMilestoneType
  title: string
  task_id: string | null
  start_value: number | null
  target_value: number | null
  unit: string | null
  current_value: number | null
  completed: boolean
  sort_order: number
  created_at: string
  updated_at: string
  /** Populated when fetching goal details: the linked task for type 'task' */
  task?: Task | null
}

/** Goal entity: main goal with name, dates, and progress */
export interface Goal {
  id: string
  user_id: string | null
  name: string
  description: string | null
  start_date: string
  target_date: string
  progress: number
  created_at: string
  updated_at: string
}

/** Goal with details: goal + milestones + linked habits + computed progress */
export interface GoalWithDetails extends Goal {
  milestones: GoalMilestone[]
  linked_habits: Array<{
    id: string
    habit_id: string
    habit: {
      id: string
      name: string
      color: string
    }
  }>
  computed_progress: number
}

/** Goal history entry: tracks events for a goal */
export interface GoalHistory {
  id: string
  goal_id: string
  event_type: GoalHistoryEventType
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Input for creating a new goal */
export interface CreateGoalInput {
  name: string
  user_id?: string | null
  description?: string | null
  start_date: string
  target_date: string
  progress?: number
}

/** Input for updating an existing goal */
export interface UpdateGoalInput {
  name?: string
  description?: string | null
  start_date?: string
  target_date?: string
  progress?: number
}

/** Input for creating a milestone */
export interface CreateMilestoneInput {
  goal_id: string
  type: GoalMilestoneType
  title: string
  task_id?: string | null
  start_value?: number | null
  target_value?: number | null
  unit?: string | null
  current_value?: number | null
  completed?: boolean
  sort_order?: number
}

/** Input for updating a milestone */
export interface UpdateMilestoneInput {
  title?: string
  task_id?: string | null
  start_value?: number | null
  target_value?: number | null
  unit?: string | null
  current_value?: number | null
  completed?: boolean
  sort_order?: number
}
