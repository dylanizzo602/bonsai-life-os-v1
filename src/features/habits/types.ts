/* Habit types: TypeScript definitions for habits, entries, and inputs */

/** Habit frequency: daily, weekly, times per day, or every N days */
export type HabitFrequency = 'daily' | 'weekly' | 'times_per_day' | 'every_x_days'

/**
 * For frequency 'weekly', frequency_target is a day-of-week bitmask:
 * bit 0 = Sunday, bit 1 = Monday, … bit 6 = Saturday (e.g. Monday = 2, Mon+Wed = 2|4 = 6).
 */

/** Habit color id for streak/cell swatch (matches modal palette) */
export type HabitColorId =
  | 'orange'
  | 'yellow'
  | 'green'
  | 'light_blue'
  | 'dark_blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'grey'

/** Main habit entity: name, frequency, optional reminder, color */
export interface Habit {
  id: string
  user_id: string | null
  name: string
  description: string | null
  sort_order: number
  frequency: HabitFrequency
  frequency_target: number | null
  add_to_todos: boolean
  reminder_time: string | null
  reminder_id: string | null
  color: HabitColorId
  created_at: string
  updated_at: string
}

/** Habit entry: one per habit per day; status completed or skipped (no row = open) */
export interface HabitEntry {
  id: string
  habit_id: string
  entry_date: string
  status: 'completed' | 'skipped'
  created_at: string
}

/** Input for creating a new habit */
export interface CreateHabitInput {
  name: string
  user_id?: string | null
  description?: string | null
  sort_order?: number
  frequency?: HabitFrequency
  frequency_target?: number | null
  add_to_todos?: boolean
  reminder_time?: string | null
  color?: HabitColorId
}

/** Input for updating an existing habit (all optional except name can be updated) */
export interface UpdateHabitInput {
  name?: string
  description?: string | null
  sort_order?: number
  frequency?: HabitFrequency
  frequency_target?: number | null
  add_to_todos?: boolean
  reminder_time?: string | null
  reminder_id?: string | null
  color?: HabitColorId
}

/** Habit with computed streak info for UI */
export interface HabitWithStreaks extends Habit {
  currentStreak: number
  longestStreak: number
  /** Dates (YYYY-MM-DD) in current streak, oldest first; for cell shading */
  currentStreakDates: string[]
}
