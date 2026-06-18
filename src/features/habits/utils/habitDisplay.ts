/* habitDisplay: Shared icon, color, and completion label helpers for habit UIs */

import type { Habit, HabitColorId } from '../types'
import { formatHabitStreakCount } from '../formatHabitStreak'

/** Default Material icon when habit has no icon_name */
export const DEFAULT_HABIT_ICON = 'spa'

/** Selectable icons in the habit icon picker */
export const HABIT_ICON_OPTIONS = [
  'spa',
  'self_improvement',
  'menu_book',
  'fitness_center',
  'water_drop',
  'timer',
  'edit',
  'cached',
  'notifications',
  'light_mode',
  'auto_awesome_motion',
  'psychology',
  'directions_run',
] as const

/** Five preset swatches mapped to existing HabitColorId values */
export const HABIT_COLOR_SWATCHES: { id: HabitColorId; className: string }[] = [
  { id: 'green', className: 'bg-[#7D8C7C]' },
  { id: 'dark_blue', className: 'bg-[#5B6B87]' },
  { id: 'orange', className: 'bg-[#9E8C7D]' },
  { id: 'light_blue', className: 'bg-[#7D9E9E]' },
  { id: 'purple', className: 'bg-[#8C7D9E]' },
]

/** Resolve display icon: stored icon_name, else keyword match from name */
export function getHabitMaterialIcon(habit: Pick<Habit, 'name'> & { icon_name?: string }): string {
  if (habit.icon_name && habit.icon_name.trim()) {
    return habit.icon_name.trim()
  }
  const n = habit.name.toLowerCase()
  if (n.includes('meditat')) return 'self_improvement'
  if (n.includes('read')) return 'menu_book'
  if (n.includes('exercise') || n.includes('workout') || n.includes('gym')) return 'fitness_center'
  if (n.includes('water') || n.includes('hydrat')) return 'water_drop'
  if (n.includes('journal')) return 'edit'
  if (n.includes('work') || n.includes('focus')) return 'timer'
  return DEFAULT_HABIT_ICON
}

/** Subtitle for completed habit cards */
export function getHabitCompletionSubtitle(
  habit: Pick<Habit, 'frequency' | 'frequency_target'>,
  streak: number,
): string {
  return `Target met • ${formatHabitStreakCount(habit, streak)} Streak`
}
