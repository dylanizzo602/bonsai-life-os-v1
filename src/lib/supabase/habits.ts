/* Habit data access layer: Supabase CRUD for habits, entries, and todo reminder scheduling */
import { supabase } from './client'
import { upsertLinkedTaskForHabit } from '../habitLinkedTask'
import {
  advanceTodoRemindAtIfDueOn,
  computeInitialTodoRemindAt,
  shouldScheduleHabitTodo,
  habitReminderInstantForLocalToday,
} from '../habitTodoSchedule'
import type {
  Habit,
  HabitEntry,
  CreateHabitInput,
  UpdateHabitInput,
} from '../../features/habits/types'

/** Reminder offsets sanitizer: keep only finite, non-zero integer minute offsets */
function normalizeAdditionalReminderOffsets(
  offsets: number[] | null | undefined,
): number[] {
  if (!offsets || offsets.length === 0) return []
  const cleaned = offsets
    .filter((x) => typeof x === 'number' && Number.isFinite(x))
    .map((x) => Math.trunc(x))
    .filter((x) => x !== 0)
  /* De-dupe and keep a stable order (sorted) so updates are deterministic */
  return Array.from(new Set(cleaned)).sort((a, b) => a - b)
}

/** Local calendar YYYY-MM-DD for "today" in the browser */
function todayLocalYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
 * Create a new habit. If add_to_todos and scheduling inputs exist, sets todo_remind_at.
 */
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const addToTodos = input.add_to_todos ?? true
  /* Reminder offsets: only meaningful when add_to_todos is enabled */
  const additionalOffsets = addToTodos
    ? normalizeAdditionalReminderOffsets(input.additional_reminder_offsets_mins)
    : []
  let todoRemindAt: string | null = null
  if (
    addToTodos &&
    shouldScheduleHabitTodo({
      add_to_todos: true,
      reminder_time: input.reminder_time ?? null,
      desired_action: input.desired_action ?? null,
      minimum_action: input.minimum_action ?? null,
    })
  ) {
    todoRemindAt =
      computeInitialTodoRemindAt(
        {
          reminder_time: input.reminder_time ?? null,
          desired_action: input.desired_action ?? null,
          minimum_action: input.minimum_action ?? null,
        },
        todayLocalYMD(),
      ) ?? habitReminderInstantForLocalToday(input.reminder_time ?? '09:00:00')
  }

  const insertData: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? null,
    desired_action: input.desired_action ?? null,
    minimum_action: input.minimum_action ?? null,
    sort_order: input.sort_order ?? 0,
    frequency: input.frequency ?? 'daily',
    frequency_target: input.frequency_target ?? null,
    add_to_todos: addToTodos,
    reminder_time: input.reminder_time ?? null,
    additional_reminder_offsets_mins: additionalOffsets,
    reminder_id: null,
    todo_remind_at: todoRemindAt,
    color: input.color ?? 'green',
  }

  if (input.user_id) {
    insertData.user_id = input.user_id
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) insertData.user_id = user.id
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

  const created = data as Habit
  try {
    await upsertLinkedTaskForHabit(created)
  } catch (e) {
    console.error('Error syncing linked task for habit:', e)
  }
  return created
}

/**
 * Update an existing habit. Recomputes todo_remind_at when add_to_todos or schedule fields change.
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
  /* Additional reminder offsets: default to existing (coerce null to []) */
  const additionalOffsets = addToTodos
    ? normalizeAdditionalReminderOffsets(
        input.additional_reminder_offsets_mins ?? habit.additional_reminder_offsets_mins ?? [],
      )
    : []
  const desiredAction = input.desired_action !== undefined ? input.desired_action : habit.desired_action
  const minimumAction = input.minimum_action !== undefined ? input.minimum_action : habit.minimum_action

  const synthetic: Pick<Habit, 'add_to_todos' | 'reminder_time' | 'desired_action' | 'minimum_action'> = {
    add_to_todos: addToTodos,
    reminder_time: reminderTime,
    desired_action: desiredAction,
    minimum_action: minimumAction,
  }

  /* Only recompute next due when schedule-related fields change; otherwise keep todo_remind_at (e.g. name-only edit). */
  const scheduleAffectingChanged =
    input.add_to_todos !== undefined ||
    input.reminder_time !== undefined ||
    input.frequency !== undefined ||
    input.frequency_target !== undefined ||
    input.desired_action !== undefined ||
    input.minimum_action !== undefined

  let todoRemindAt: string | null = habit.todo_remind_at ?? null

  if (!addToTodos || !shouldScheduleHabitTodo(synthetic)) {
    todoRemindAt = null
  } else if (scheduleAffectingChanged || !todoRemindAt) {
    const initial = computeInitialTodoRemindAt(
      {
        reminder_time: reminderTime,
        desired_action: desiredAction,
        minimum_action: minimumAction,
      },
      todayLocalYMD(),
    )
    todoRemindAt = initial ?? habitReminderInstantForLocalToday(reminderTime ?? '09:00:00')
  }

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.desired_action !== undefined) updateData.desired_action = input.desired_action
  if (input.minimum_action !== undefined) updateData.minimum_action = input.minimum_action
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.frequency !== undefined) updateData.frequency = input.frequency
  if (input.frequency_target !== undefined) updateData.frequency_target = input.frequency_target
  if (input.add_to_todos !== undefined) updateData.add_to_todos = input.add_to_todos
  if (input.reminder_time !== undefined) updateData.reminder_time = input.reminder_time
  /* Keep offsets in sync; also clear them when add_to_todos is turned off */
  if (input.additional_reminder_offsets_mins !== undefined || input.add_to_todos !== undefined) {
    updateData.additional_reminder_offsets_mins = additionalOffsets
  }
  if (input.reminder_id !== undefined) updateData.reminder_id = input.reminder_id
  if (input.color !== undefined) updateData.color = input.color
  updateData.todo_remind_at = todoRemindAt

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

  const updatedHabit = data as Habit
  try {
    await upsertLinkedTaskForHabit(updatedHabit)
  } catch (e) {
    console.error('Error syncing linked task for habit:', e)
  }
  return updatedHabit
}

/**
 * Delete a habit. CASCADE removes habit_entries.
 */
export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) {
    console.error('Error deleting habit:', error)
    throw error
  }
}

/**
 * Set or clear entry for a habit on a date. When status is completed/minimum/skipped, advance todo_remind_at if due on entryDate.
 */
export async function setEntry(
  habitId: string,
  entryDate: string,
  status: 'completed' | 'skipped' | 'minimum' | null,
): Promise<void> {
  if (status === null) {
    /* Entry delete: clear the single day status (no schedule advance). */
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

  /* Entry upsert: set the day status (completed/minimum/skipped). */
  const { error } = await supabase.from('habit_entries').upsert(
    {
      habit_id: habitId,
      entry_date: entryDate,
      status,
    },
    { onConflict: 'habit_id,entry_date' },
  )

  if (error) {
    console.error('Error upserting habit entry:', error)
    throw error
  }

  if (status === 'completed' || status === 'minimum' || status === 'skipped') {
    try {
      /* Reminder advance: if today's entry satisfied the due reminder, bump todo_remind_at forward and keep the linked task due_date in sync. */
      const { data: habitRow, error: fetchErr } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single()
      if (fetchErr || !habitRow) {
        console.error('Error fetching habit for todo advance:', fetchErr)
        return
      }
      const habit = habitRow as Habit
      const nextAt = advanceTodoRemindAtIfDueOn(habit, entryDate)

      if (nextAt) {
        const { error: upErr } = await supabase
          .from('habits')
          .update({ todo_remind_at: nextAt })
          .eq('id', habitId)
        if (upErr) {
          console.error('Error advancing habit todo_remind_at:', upErr)
          return
        }

        /* Linked task sync: Tasks page renders reminders from the habit-linked task's due_date, so we must update it when todo_remind_at advances. */
        try {
          await upsertLinkedTaskForHabit({ ...habit, todo_remind_at: nextAt })
        } catch (e) {
          console.error('Error syncing linked task after habit advance:', e)
        }
      }
    } catch (err) {
      console.error('Error advancing habit reminder:', err)
    }
  }
}

/**
 * Fetch entries for the given habits in the date range. Returns a map habit_id -> entries[].
 */
export async function getEntriesForHabits(
  habitIds: string[],
  dateFrom: string,
  dateTo: string,
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
  dateTo?: string,
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
