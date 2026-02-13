/* Reminder data access layer: Supabase CRUD for reminders */
import { supabase } from './client'
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

  return (data ?? []) as Reminder[]
}

/**
 * Create a new reminder.
 */
export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const insertData: Record<string, unknown> = {
    name: input.name,
    user_id: input.user_id ?? null,
    remind_at: input.remind_at ?? null,
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
  if (input.completed !== undefined) updateData.completed = input.completed

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

/**
 * Toggle reminder completion status.
 */
export async function toggleReminderComplete(id: string, completed: boolean): Promise<Reminder> {
  return updateReminder(id, { completed })
}
