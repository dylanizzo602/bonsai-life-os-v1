/* habitReminderNotifications: Supabase access for per-day habit reminder instances */

import { supabase } from './client'
import type { HabitOccurrenceEntry, HabitOccurrenceSource, HabitOccurrenceTaskSource } from '../habitReminderOccurrences'
import { listMissedHabitOccurrences } from '../habitReminderOccurrences'

export type HabitReminderNotificationStatus = 'pending' | 'dismissed' | 'resolved'

export interface HabitReminderNotification {
  id: string
  user_id: string
  habit_id: string
  occurrence_date: string
  remind_at: string
  status: HabitReminderNotificationStatus
  pushed_at: string | null
  dismissed_at: string | null
  resolved_at: string | null
  inserted_at: string
  updated_at: string
}

/** Fetch pending habit reminder instances for the signed-in user. */
export async function getPendingHabitReminderNotifications(): Promise<HabitReminderNotification[]> {
  const { data, error } = await supabase
    .from('habit_reminder_notifications')
    .select('*')
    .eq('status', 'pending')
    .order('occurrence_date', { ascending: true })
    .order('remind_at', { ascending: true })

  if (error) {
    console.error('Error fetching habit reminder notifications:', error)
    throw error
  }

  return (data ?? []) as HabitReminderNotification[]
}

/**
 * Ensure pending notification rows exist for all currently missed occurrences.
 * Called on app load so the bell works even before the edge function cron runs.
 */
export async function ensurePendingHabitReminderNotifications(params: {
  habits: HabitOccurrenceSource[]
  tasksByHabitId: Record<string, HabitOccurrenceTaskSource>
  entriesByHabit: Record<string, HabitOccurrenceEntry[]>
  timeZone: string
  todayYMD: string
}): Promise<void> {
  const { habits, tasksByHabitId, entriesByHabit, timeZone, todayYMD } = params
  const rowsToUpsert: {
    habit_id: string
    occurrence_date: string
    remind_at: string
    status: 'pending'
  }[] = []

  for (const habit of habits) {
    const task = tasksByHabitId[habit.id]
    if (!task) continue

    const missed = listMissedHabitOccurrences({
      habit,
      task,
      entries: entriesByHabit[habit.id] ?? [],
      timeZone,
      todayYMD,
    })

    for (const occurrence of missed) {
      rowsToUpsert.push({
        habit_id: habit.id,
        occurrence_date: occurrence.occurrenceDate,
        remind_at: occurrence.remindAt,
        status: 'pending',
      })
    }
  }

  if (rowsToUpsert.length === 0) return

  const { error } = await supabase.from('habit_reminder_notifications').upsert(rowsToUpsert, {
    onConflict: 'user_id,habit_id,occurrence_date',
    ignoreDuplicates: true,
  })

  if (error) {
    console.error('Error ensuring habit reminder notifications:', error)
    throw error
  }
}

/** Dismiss a pending habit reminder instance by id. */
export async function dismissHabitReminderNotification(id: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('habit_reminder_notifications')
    .update({ status: 'dismissed', dismissed_at: now })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) {
    console.error('Error dismissing habit reminder notification:', error)
    throw error
  }
}

/** Dismiss by habit id + occurrence date (for localStorage migration). */
export async function dismissHabitReminderByOccurrence(
  habitId: string,
  occurrenceDate: string,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('habit_reminder_notifications')
    .upsert(
      {
        habit_id: habitId,
        occurrence_date: occurrenceDate,
        remind_at: new Date(occurrenceDate + 'T12:00:00').toISOString(),
        status: 'dismissed',
        dismissed_at: now,
      },
      { onConflict: 'user_id,habit_id,occurrence_date' },
    )

  if (error) {
    console.error('Error dismissing habit reminder by occurrence:', error)
    throw error
  }
}

/** Mark a habit reminder instance resolved after logging activity. */
export async function resolveHabitReminderNotification(id: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('habit_reminder_notifications')
    .update({ status: 'resolved', resolved_at: now })
    .eq('id', id)

  if (error) {
    console.error('Error resolving habit reminder notification:', error)
    throw error
  }
}

/** Resolve by habit id + occurrence date when notification id is unknown. */
export async function resolveHabitReminderByOccurrence(
  habitId: string,
  occurrenceDate: string,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('habit_reminder_notifications')
    .update({ status: 'resolved', resolved_at: now })
    .eq('habit_id', habitId)
    .eq('occurrence_date', occurrenceDate)
    .eq('status', 'pending')

  if (error) {
    console.error('Error resolving habit reminder by occurrence:', error)
    throw error
  }
}
