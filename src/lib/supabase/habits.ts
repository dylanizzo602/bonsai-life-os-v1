/* Habit data access layer: Supabase CRUD for habits, entries, and reminder wiring */
import { supabase } from './client'
import {
  createReminder,
  updateReminder,
  deleteReminder,
} from './reminders'
import { serializeRecurrencePattern } from '../recurrence'
import type { RecurrencePattern } from '../recurrence'
import type {
  Habit,
  HabitEntry,
  CreateHabitInput,
  UpdateHabitInput,
  HabitFrequency,
} from '../../features/habits/types'

/** Day codes for recurrence byDay (Sunday = 0 … Saturday = 6); habit frequency_target bitmask uses same order (1=Sun … 64=Sat) */
const RECURRENCE_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** Build recurrence pattern JSON from habit frequency for reminders. Weekly habits get byDay from frequency_target bitmask. */
function recurrenceForHabitFrequency(
  frequency: HabitFrequency,
  frequencyTarget: number | null
): string | null {
  const pattern: RecurrencePattern = { freq: 'day', interval: 1 }
  if (frequency === 'daily' || frequency === 'times_per_day') {
    pattern.freq = 'day'
    pattern.interval = 1
  } else if (frequency === 'weekly') {
    pattern.freq = 'week'
    pattern.interval = 1
    if (frequencyTarget != null && frequencyTarget >= 1 && frequencyTarget <= 127) {
      pattern.byDay = [0, 1, 2, 3, 4, 5, 6]
        .filter((i) => (frequencyTarget & (1 << i)) !== 0)
        .map((i) => RECURRENCE_DAY_CODES[i])
      if (pattern.byDay.length === 0) pattern.byDay = ['MO']
    }
  } else if (frequency === 'every_x_days' && frequencyTarget != null && frequencyTarget > 0) {
    pattern.freq = 'day'
    pattern.interval = frequencyTarget
  }
  return serializeRecurrencePattern(pattern)
}

/** Build first remind_at ISO string for today at given time (HH:mm or HH:mm:ss) */
function firstRemindAt(reminderTime: string): string {
  const now = new Date()
  const ymd = now.toISOString().slice(0, 10)
  const timePart = reminderTime.length <= 5 ? `${reminderTime}:00` : reminderTime.slice(0, 8)
  return `${ymd}T${timePart}`
}

/**
 * Fetch all habits ordered by sort_order then created_at.
 */
export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching habits:', error)
    throw error
  }

  return (data ?? []) as Habit[]
}

/**
 * Create a new habit. If add_to_todos and reminder_time are set, creates a recurring reminder and stores reminder_id.
 */
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  let reminderId: string | null = null
  if (input.add_to_todos && input.reminder_time) {
    const recurrence = recurrenceForHabitFrequency(
      input.frequency ?? 'daily',
      input.frequency_target ?? null
    )
    const remindAt = firstRemindAt(input.reminder_time)
    const reminder = await createReminder({
      name: input.name,
      user_id: input.user_id ?? null,
      remind_at: remindAt,
      recurrence_pattern: recurrence,
    })
    reminderId = reminder.id
  }

  const insertData: Record<string, unknown> = {
    user_id: input.user_id ?? null,
    name: input.name,
    description: input.description ?? null,
    sort_order: input.sort_order ?? 0,
    frequency: input.frequency ?? 'daily',
    frequency_target: input.frequency_target ?? null,
    add_to_todos: input.add_to_todos ?? false,
    reminder_time: input.reminder_time ?? null,
    reminder_id: reminderId,
    color: input.color ?? 'green',
  }

  const { data, error } = await supabase
    .from('habits')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating habit:', error)
    throw error
  }

  return data as Habit
}

/**
 * Update an existing habit. Creates/updates/deletes linked reminder when add_to_todos or reminder_time change.
 */
export async function updateHabit(id: string, input: UpdateHabitInput): Promise<Habit> {
  const { data: existing, error: fetchError } = await supabase
    .from('habits')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching habit for update:', fetchError)
    throw fetchError ?? new Error('Habit not found')
  }

  const habit = existing as Habit
  const addToTodos = input.add_to_todos ?? habit.add_to_todos
  const reminderTime = input.reminder_time ?? habit.reminder_time
  const frequency = input.frequency ?? habit.frequency
  const frequencyTarget = input.frequency_target ?? habit.frequency_target

  if (habit.reminder_id && (!addToTodos || !reminderTime)) {
    await deleteReminder(habit.reminder_id)
  }

  let reminderId: string | null = habit.reminder_id
  if (addToTodos && reminderTime) {
    const recurrence = recurrenceForHabitFrequency(frequency, frequencyTarget)
    const remindAt = firstRemindAt(reminderTime)
    if (reminderId) {
      await updateReminder(reminderId, {
        name: input.name ?? habit.name,
        remind_at: remindAt,
        recurrence_pattern: recurrence,
      })
    } else {
      const reminder = await createReminder({
        name: input.name ?? habit.name,
        user_id: habit.user_id,
        remind_at: remindAt,
        recurrence_pattern: recurrence,
      })
      reminderId = reminder.id
    }
  } else {
    reminderId = null
  }

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.frequency !== undefined) updateData.frequency = input.frequency
  if (input.frequency_target !== undefined) updateData.frequency_target = input.frequency_target
  if (input.add_to_todos !== undefined) updateData.add_to_todos = input.add_to_todos
  if (input.reminder_time !== undefined) updateData.reminder_time = input.reminder_time
  if (input.reminder_id !== undefined) updateData.reminder_id = input.reminder_id
  if (input.color !== undefined) updateData.color = input.color
  updateData.reminder_id = reminderId

  const { data, error } = await supabase
    .from('habits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating habit:', error)
    throw error
  }

  return data as Habit
}

/**
 * Delete a habit. Deletes linked reminder if any; CASCADE removes habit_entries.
 */
export async function deleteHabit(id: string): Promise<void> {
  const { data: existing } = await supabase.from('habits').select('reminder_id').eq('id', id).single()
  if (existing?.reminder_id) {
    await deleteReminder(existing.reminder_id as string)
  }

  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) {
    console.error('Error deleting habit:', error)
    throw error
  }
}

/**
 * Set or clear entry for a habit on a date. status 'completed' | 'minimum' | 'skipped' upserts; null means delete (open).
 */
export async function setEntry(
  habitId: string,
  entryDate: string,
  status: 'completed' | 'skipped' | 'minimum' | null
): Promise<void> {
  if (status === null) {
    const { error } = await supabase
      .from('habit_entries')
      .delete()
      .eq('habit_id', habitId)
      .eq('entry_date', entryDate)
    if (error) {
      console.error('Error deleting habit entry:', error)
      throw error
    }
    return
  }

  const { error } = await supabase.from('habit_entries').upsert(
    {
      habit_id: habitId,
      entry_date: entryDate,
      status,
    },
    { onConflict: 'habit_id,entry_date' }
  )

  if (error) {
    console.error('Error upserting habit entry:', error)
    throw error
  }
}

/**
 * Fetch entries for the given habits in the date range. Returns a map habit_id -> entries[].
 */
export async function getEntriesForHabits(
  habitIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<Record<string, HabitEntry[]>> {
  if (habitIds.length === 0) {
    return {}
  }

  const { data, error } = await supabase
    .from('habit_entries')
    .select('*')
    .in('habit_id', habitIds)
    .gte('entry_date', dateFrom)
    .lte('entry_date', dateTo)
    .order('entry_date', { ascending: true })

  if (error) {
    console.error('Error fetching habit entries:', error)
    throw error
  }

  const entries = (data ?? []) as HabitEntry[]
  const byHabit: Record<string, HabitEntry[]> = {}
  for (const id of habitIds) {
    byHabit[id] = []
  }
  for (const e of entries) {
    byHabit[e.habit_id].push(e)
  }
  return byHabit
}

/**
 * Fetch all entries for a single habit (for streak calculation). Optional date range; if omitted, fetch all.
 */
export async function getEntriesForHabit(
  habitId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<HabitEntry[]> {
  let query = supabase
    .from('habit_entries')
    .select('*')
    .eq('habit_id', habitId)
    .order('entry_date', { ascending: true })

  if (dateFrom) query = query.gte('entry_date', dateFrom)
  if (dateTo) query = query.lte('entry_date', dateTo)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching habit entries:', error)
    throw error
  }

  return (data ?? []) as HabitEntry[]
}
