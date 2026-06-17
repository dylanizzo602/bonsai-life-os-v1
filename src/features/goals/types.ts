/* Goal types: TypeScript definitions for goals, milestones, history, and related interfaces */
import type { Task } from '../tasks/types'
import type { IdentityCategory } from '../../lib/supabase/identities'

/** Life-area category for goals (aligned with identity categories) */
export type GoalCategory = IdentityCategory

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
  description: string | null
  start_value: number | null
  target_value: number | null
  unit: string | null
  current_value: number | null
  completed: boolean
  sort_order: number
  created_at: string
  updated_at: string
  /** Populated when fetching goal details: linked tasks for type 'task' */
  linked_tasks?: Task[]
}

/** Goal entity: main goal with name, optional dates, progress, and active flag */
export interface Goal {
  id: string
  user_id: string | null
  name: string
  description: string | null
  start_date: string | null
  target_date: string | null
  progress: number
  is_active: boolean
  icon_name: string
  category: GoalCategory | null
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

/** Input for creating a new goal (defaults to active when is_active is omitted) */
export interface CreateGoalInput {
  name: string
  user_id?: string | null
  description?: string | null
  start_date?: string | null
  target_date?: string | null
  progress?: number
  is_active?: boolean
  icon_name?: string | null
  category?: GoalCategory | null
}

/** Input for updating an existing goal (including toggling active/inactive) */
export interface UpdateGoalInput {
  name?: string
  description?: string | null
  start_date?: string | null
  target_date?: string | null
  progress?: number
  is_active?: boolean
  icon_name?: string | null
  category?: GoalCategory | null
}

/** Input for creating a milestone */
export interface CreateMilestoneInput {
  goal_id: string
  type: GoalMilestoneType
  title: string
  description?: string | null
  task_ids?: string[]
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
  description?: string | null
  task_ids?: string[]
  start_value?: number | null
  target_value?: number | null
  unit?: string | null
  current_value?: number | null
  completed?: boolean
  sort_order?: number
}
