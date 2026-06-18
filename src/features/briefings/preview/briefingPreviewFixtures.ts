/* Preview fixtures: sample data when preview mode has no real user content */

import type { Goal, GoalMilestone } from '../../goals/types'
import type { HabitWithStreaks } from '../../habits/types'
import type { InboxItem } from '../../home/types'
import type { ReflectionEntry } from '../../reflections/types'
import type { Task } from '../../tasks/types'
import type { YesterdayHabitBreakdown } from '../utils/yesterdayHabitBreakdown'

const now = new Date().toISOString()

/** Shared preview task defaults */
function previewTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    id: overrides.id,
    title: overrides.title,
    user_id: null,
    parent_id: null,
    habit_id: overrides.habit_id ?? null,
    goal_id: null,
    description: null,
    start_date: null,
    due_date: overrides.due_date ?? null,
    priority: overrides.priority ?? 'low',
    tags: [],
    time_estimate: null,
    attachments: [],
    category: null,
    status: overrides.status ?? 'active',
    recurrence_pattern: null,
    completed_at: null,
    created_at: overrides.created_at ?? now,
    updated_at: now,
  }
}

/** Sample Sunday undergrowth task */
export const PREVIEW_UNDERGROWTH_TASKS: Task[] = [
  previewTask({
    id: 'preview-undergrowth-1',
    title: 'Organize digital files',
    priority: 'low',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  }),
  previewTask({
    id: 'preview-undergrowth-2',
    title: 'Research vacation spots',
    priority: 'none',
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
  }),
]

/** Sample inbox items */
export const PREVIEW_INBOX_ITEMS: InboxItem[] = [
  {
    id: 'preview-inbox-1',
    user_id: null,
    name: 'Call dentist for appointment',
    sort_order: 0,
    created_at: now,
  },
  {
    id: 'preview-inbox-2',
    user_id: null,
    name: 'Buy birthday gift for Alex',
    sort_order: 1,
    created_at: now,
  },
]

/** Sample overdue task for missed-items review */
export const PREVIEW_OVERDUE_TASKS: Task[] = [
  previewTask({
    id: 'preview-overdue-1',
    title: 'Submit expense report',
    priority: 'high',
    due_date: new Date(Date.now() - 2 * 86400000).toISOString(),
  }),
]

/** Sample habit for preview habit review and overdue reminders */
export const PREVIEW_HABIT: HabitWithStreaks = {
  id: 'preview-habit-1',
  user_id: null,
  name: 'Morning meditation',
  description: null,
  desired_action: 'Meditate 10 minutes',
  minimum_action: 'Take three deep breaths',
  sort_order: 0,
  frequency: 'daily',
  frequency_target: null,
  monthly_interval: 1,
  monthly_day: 1,
  add_to_todos: true,
  reminder_time: '07:00',
  additional_reminder_offsets_mins: null,
  reminder_id: null,
  todo_remind_at: new Date(Date.now() - 86400000).toISOString(),
  color: 'green',
  icon_name: 'self_improvement',
  created_at: now,
  updated_at: now,
  currentStreak: 3,
  longestStreak: 12,
  currentStreakDates: [],
  currentStreakTargetCount: 3,
  currentStreakMinimumCount: 0,
}

export const PREVIEW_HABIT_COMPLETED: HabitWithStreaks = {
  ...PREVIEW_HABIT,
  id: 'preview-habit-2',
  name: 'Evening walk',
  desired_action: 'Walk 30 minutes',
  minimum_action: 'Step outside for 5 minutes',
  color: 'light_blue',
  icon_name: 'directions_walk',
}

/** Sample overdue habit reminder row */
export const PREVIEW_OVERDUE_HABIT_REMINDERS: Array<{
  habit: HabitWithStreaks
  task: Task
  remindAt: string | null
}> = [
  {
    habit: PREVIEW_HABIT,
    task: previewTask({
      id: 'preview-habit-task-1',
      title: PREVIEW_HABIT.name,
      habit_id: PREVIEW_HABIT.id,
      due_date: new Date(Date.now() - 86400000).toISOString(),
    }),
    remindAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

/** Sample habit breakdown for yesterday habit review */
export const PREVIEW_HABIT_BREAKDOWN: YesterdayHabitBreakdown = {
  scheduled: [PREVIEW_HABIT_COMPLETED, PREVIEW_HABIT],
  completed: [PREVIEW_HABIT_COMPLETED],
  missed: [PREVIEW_HABIT],
  skippedYesterday: [PREVIEW_HABIT],
}

/** Sample active goal for Sunday goal review */
export const PREVIEW_GOAL: Goal = {
  id: 'preview-goal-1',
  user_id: null,
  name: 'Launch side project',
  description: 'Sample goal for briefing preview',
  start_date: null,
  target_date: null,
  progress: 40,
  is_active: true,
  icon_name: 'flag',
  category: 'work',
  created_at: now,
  updated_at: now,
}

/** Sample milestones for preview goal review */
export const PREVIEW_MILESTONES: GoalMilestone[] = [
  {
    id: 'preview-milestone-1',
    goal_id: PREVIEW_GOAL.id,
    type: 'boolean',
    title: 'Set up project repo',
    description: null,
    start_value: null,
    target_value: null,
    unit: null,
    current_value: null,
    completed: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'preview-milestone-2',
    goal_id: PREVIEW_GOAL.id,
    type: 'number',
    title: 'Ship MVP features',
    description: null,
    start_value: 0,
    target_value: 5,
    unit: 'features',
    current_value: 2,
    completed: false,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
]

/** Sample past reflection for memorable moment "years ago today" card */
export const PREVIEW_YEARS_AGO_ENTRY: { entry: ReflectionEntry; yearsAgo: number } = {
  yearsAgo: 2,
  entry: {
    id: 'preview-reflection-years-ago',
    user_id: null,
    type: 'morning_briefing',
    title: 'Morning briefing',
    responses: {
      memorableMoment:
        'A quiet morning walk before the family woke up — stillness I want to remember.',
      gratefulFor: 'Time with people who matter.',
    },
    created_at: new Date(Date.now() - 2 * 365.25 * 86400000).toISOString(),
  },
}

/** True when an id belongs to preview fixture data (skip DB writes) */
export function isPreviewFixtureId(id: string): boolean {
  return id.startsWith('preview-')
}
