/* habitLinkedTask: Create/update the single tasks row linked to a habit (due + recurrence from habit settings). */

import type { Habit } from '../features/habits/types'
import {
  computeInitialTodoRemindAt,
  habitReminderInstantForLocalToday,
  recurrencePatternJsonForHabit,
  DEFAULT_HABIT_TODO_CLOCK,
} from './habitTodoSchedule'
import { createTask, updateTask, getTaskByHabitId } from './supabase/tasks'

/** Local calendar YYYY-MM-DD */
function todayLocalYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Title for the linked task: target action, else habit name */
export function linkedTaskTitle(habit: Habit): string {
  const t = habit.desired_action?.trim()
  return t && t.length > 0 ? t : habit.name
}

/** Due date ISO for the recurring task: prefer habit.todo_remind_at, else today at reminder wall time */
function linkedTaskDueIso(habit: Habit): string | null {
  if (habit.todo_remind_at) return habit.todo_remind_at
  const initial = computeInitialTodoRemindAt(
    {
      reminder_time: habit.reminder_time,
      desired_action: habit.desired_action,
      minimum_action: habit.minimum_action,
    },
    todayLocalYMD(),
  )
  if (initial) return initial
  return habitReminderInstantForLocalToday(habit.reminder_time ?? DEFAULT_HABIT_TODO_CLOCK)
}

/**
 * After habit create/update: upsert the linked task row (same recurrence as habit todo scheduling).
 */
export async function upsertLinkedTaskForHabit(habit: Habit): Promise<void> {
  if (!habit.user_id) return

  const title = linkedTaskTitle(habit)
  const recurrence_pattern = recurrencePatternJsonForHabit(habit.frequency, habit.frequency_target)
  const due_date = linkedTaskDueIso(habit)

  const existing = await getTaskByHabitId(habit.id)
  if (existing) {
    await updateTask(existing.id, {
      title,
      due_date,
      recurrence_pattern,
    })
    return
  }

  await createTask({
    title,
    user_id: habit.user_id,
    due_date,
    recurrence_pattern,
    status: 'active',
    habit_id: habit.id,
  })
}
