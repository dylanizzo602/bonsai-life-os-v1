/* Reminder types: TypeScript definitions for reminder entities */

/** Main reminder entity: name, single remind datetime, completed flag */
export interface Reminder {
  id: string
  user_id: string | null
  name: string
  remind_at: string | null
  completed: boolean
  created_at: string
  updated_at: string
}

/** Input for creating a new reminder */
export interface CreateReminderInput {
  name: string
  user_id?: string | null
  remind_at?: string | null
}

/** Input for updating an existing reminder (all optional) */
export interface UpdateReminderInput {
  name?: string
  remind_at?: string | null
  completed?: boolean
}
