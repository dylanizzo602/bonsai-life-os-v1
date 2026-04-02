/* Reminder data access layer: Supabase CRUD for reminders */
import { supabase } from './client'
import { isoInstantToLocalCalendarYMD } from '../localCalendarDate'
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
  return ((data ?? []) as (Reminder & { deleted?: boolean; recurrence_pattern?: string | null })[]).map(
    (r) => ({
      ...r,
      deleted: r.deleted ?? false,
      recurrence_pattern: r.recurrence_pattern ?? null,
    }),
  ) as Reminder[]
}

/**
 * Create a new reminder.
 */
export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const insertData: Record<string, unknown> = {
    name: input.name,
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

/** Format a Date as the user's local calendar date YYYY-MM-DD (not UTC). */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Parse ISO timestamp to local calendar YYYY-MM-DD for recurrence and habit-dismiss matching.
 * Delegates to isoInstantToLocalCalendarYMD so UI habit completion uses the same date as advanceReminderToNextOccurrenceIfDueOn.
 */
function toDateOnly(iso: string | null): string | null {
  return isoInstantToLocalCalendarYMD(iso)
}

/**
 * Next occurrence at the same local time-of-day as referenceIso, on the given local calendar day.
 * Produces a full ISO string for TIMESTAMPTZ so Postgres stores the correct instant (not naive UTC).
 */
function remindAtForLocalDate(ymd: string, referenceIso: string | null): string {
  const ref = referenceIso ? new Date(referenceIso) : new Date()
  const h = ref.getHours()
  const min = ref.getMinutes()
  const s = ref.getSeconds()
  const ms = ref.getMilliseconds()
  const [y, mo, d] = ymd.split('-').map(Number)
  const local = new Date(y ?? 0, (mo ?? 1) - 1, d ?? 1, h, min, s, ms)
  return local.toISOString()
}

/**
 * Build TIMESTAMPTZ for a habit reminder on a local calendar day (YYYY-MM-DD) at reminderTime (HH:mm or HH:mm:ss).
 * Used when linking UI to habit_time without a loaded reminder row, and for create/update.
 */
export function habitReminderInstantForLocalDay(ymd: string, reminderTime: string): string {
  const timePart = reminderTime.length <= 5 ? `${reminderTime}:00` : reminderTime.slice(0, 8)
  const parts = timePart.split(':').map((x) => parseInt(x, 10))
  const hh = parts[0] ?? 0
  const mm = parts[1] ?? 0
  const ss = parts[2] ?? 0
  const [y, mo, d] = ymd.split('-').map(Number)
  const local = new Date(y ?? 0, (mo ?? 1) - 1, d ?? 1, hh, mm, ss)
  return local.toISOString()
}

/**
 * Build TIMESTAMPTZ for a new habit reminder: today's local date at reminderTime (HH:mm or HH:mm:ss).
 */
export function habitReminderInstantForLocalToday(reminderTime: string): string {
  const now = new Date()
  return habitReminderInstantForLocalDay(formatLocalYMD(now), reminderTime)
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

  /* Preserve local time-of-day from the current occurrence (not UTC substring, which skews display vs settings) */
  const nextRemindAt = remindAtForLocalDate(nextDueYMD, reminder.remind_at)

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
  if (!dueYMD) {
    return reminder
  }

  // When no recurrence pattern exists (legacy habit reminders), fall back to a simple daily advance
  if (!pattern) {
    const currentDate = new Date(dueYMD + 'T12:00:00')
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() + 1)
    const nextDueYMD = formatLocalYMD(nextDate)
    const nextRemindAt = remindAtForLocalDate(nextDueYMD, reminder.remind_at)
    return updateReminder(id, { remind_at: nextRemindAt })
  }

  const nextDueYMD = getNextOccurrence(pattern, dueYMD)
  if (!nextDueYMD) {
    return reminder
  }

  const nextRemindAt = remindAtForLocalDate(nextDueYMD, reminder.remind_at)
  return updateReminder(id, { remind_at: nextRemindAt })
}

/**
 * Advance a habit reminder to the next occurrence only if it is due on entryDate (YYYY-MM-DD).
 * Used when marking a habit complete/minimum so we only dismiss once per logical completion (e.g. once for weekly, not per day).
 */
export async function advanceReminderToNextOccurrenceIfDueOn(
  id: string,
  entryDate: string
): Promise<Reminder | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Error fetching reminder:', fetchError)
    return null
  }

  const reminder = existing as Reminder
  const dueYMD = toDateOnly(reminder.remind_at)
  if (dueYMD !== entryDate) {
    return reminder
  }

  return advanceReminderToNextOccurrence(id)
}
