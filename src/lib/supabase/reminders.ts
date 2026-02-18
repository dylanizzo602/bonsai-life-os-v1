/* Reminder data access layer: Supabase CRUD for reminders */
import { supabase } from './client'
import { parseRecurrencePattern, getNextOccurrence } from '../recurrence'
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '../../features/reminders/types'

/**
 * Fetch all reminders for the current user (or all if no auth).
 * Ordered by remind_at ascending (soonest first), then created_at.
 */
export async function getReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('remind_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reminders:', error)
    throw error
  }

  /* Ensure deleted and recurrence_pattern for pre-migration rows */
  return ((data ?? []) as (Reminder & { deleted?: boolean; recurrence_pattern?: string | null })[]).map((r) => ({
    ...r,
    deleted: r.deleted ?? false,
    recurrence_pattern: r.recurrence_pattern ?? null,
  })) as Reminder[]
}

/**
 * Create a new reminder.
 */
export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const insertData: Record<string, unknown> = {
    name: input.name,
    user_id: input.user_id ?? null,
    remind_at: input.remind_at ?? null,
    recurrence_pattern: input.recurrence_pattern ?? null,
  }

  const { data, error } = await supabase
    .from('reminders')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating reminder:', error)
    throw error
  }

  return data as Reminder
}

/**
 * Update an existing reminder.
 */
export async function updateReminder(id: string, input: UpdateReminderInput): Promise<Reminder> {
  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.remind_at !== undefined) updateData.remind_at = input.remind_at
  if (input.recurrence_pattern !== undefined) updateData.recurrence_pattern = input.recurrence_pattern
  if (input.completed !== undefined) updateData.completed = input.completed
  if (input.deleted !== undefined) updateData.deleted = input.deleted

  const { data, error } = await supabase
    .from('reminders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating reminder:', error)
    throw error
  }

  return data as Reminder
}

/**
 * Delete a reminder.
 */
export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id)

  if (error) {
    console.error('Error deleting reminder:', error)
    throw error
  }
}

/** Parse ISO or date string to YYYY-MM-DD for recurrence */
function toDateOnly(iso: string | null): string | null {
  if (!iso) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

/**
 * Toggle reminder completion status.
 * When completing a recurring reminder: advance remind_at, set completed=false (reopens for next occurrence).
 */
export async function toggleReminderComplete(id: string, completed: boolean): Promise<Reminder> {
  if (!completed) {
    return updateReminder(id, { completed: false })
  }

  /* Fetch reminder to check recurrence */
  const { data: existing, error: fetchError } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching reminder:', fetchError)
    throw fetchError ?? new Error('Reminder not found')
  }

  const reminder = existing as Reminder
  const pattern = parseRecurrencePattern(reminder.recurrence_pattern ?? null)

  if (!pattern) {
    return updateReminder(id, { completed: true })
  }

  /* Recurring: advance remind_at to next occurrence, keep completed=false */
  const dueYMD = toDateOnly(reminder.remind_at)
  if (!dueYMD) {
    return updateReminder(id, { completed: true })
  }

  const nextDueYMD = getNextOccurrence(pattern, dueYMD)
  if (!nextDueYMD) {
    return updateReminder(id, { completed: true })
  }

  /* Preserve time from original remind_at; use noon if date-only */
  const orig = reminder.remind_at
  const timePart = orig && orig.includes('T') ? orig.slice(11, 19) : '12:00:00'
  const nextRemindAt = `${nextDueYMD}T${timePart}`

  return updateReminder(id, { remind_at: nextRemindAt, completed: false })
}

/**
 * Advance a recurring reminder to the next occurrence (update remind_at only).
 * Used for habit reminders: after recording complete/skip, advance to next occurrence.
 */
export async function advanceReminderToNextOccurrence(id: string): Promise<Reminder> {
  const { data: existing, error: fetchError } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching reminder:', fetchError)
    throw fetchError ?? new Error('Reminder not found')
  }

  const reminder = existing as Reminder
  const pattern = parseRecurrencePattern(reminder.recurrence_pattern ?? null)
  const dueYMD = toDateOnly(reminder.remind_at)
  if (!pattern || !dueYMD) {
    return reminder
  }

  const nextDueYMD = getNextOccurrence(pattern, dueYMD)
  if (!nextDueYMD) {
    return reminder
  }

  const orig = reminder.remind_at
  const timePart = orig && orig.includes('T') ? orig.slice(11, 19) : '12:00:00'
  const nextRemindAt = `${nextDueYMD}T${timePart}`
  return updateReminder(id, { remind_at: nextRemindAt })
}
