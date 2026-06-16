/* Goal category labels and icon options for New Goal modal */
import type { GoalCategory } from '../types'

/** Selectable Material icon names for goals */
export const GOAL_ICON_OPTIONS = [
  'potted_plant',
  'menu_book',
  'fitness_center',
  'language',
  'eco',
  'park',
  'self_improvement',
  'palette',
  'savings',
  'groups',
  'work',
  'favorite',
] as const

export type GoalIconName = (typeof GOAL_ICON_OPTIONS)[number]

export const DEFAULT_GOAL_ICON: GoalIconName = 'potted_plant'

/** Category options aligned with identity life areas */
export const GOAL_CATEGORY_OPTIONS: Array<{ value: GoalCategory; label: string }> = [
  { value: 'health', label: 'Health' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'work', label: 'Work' },
  { value: 'play', label: 'Play' },
  { value: 'personal_growth', label: 'Personal Growth' },
  { value: 'finance', label: 'Finance' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
]

/**
 * Format start/target dates for the metadata chip label.
 */
export function formatGoalDateRangeLabel(
  startDate: string | null,
  targetDate: string | null,
): string {
  if (!startDate && !targetDate) return 'Start / Target Date'
  const fmt = (ymd: string) => {
    const d = new Date(ymd + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (startDate && targetDate) return `${fmt(startDate)} – ${fmt(targetDate)}`
  if (startDate) return `Starts ${fmt(startDate)}`
  return `Target ${fmt(targetDate!)}`
}

/**
 * Resolve category display label from stored value.
 */
export function getGoalCategoryLabel(category: GoalCategory | null | undefined): string {
  if (!category) return 'Category'
  return GOAL_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? 'Category'
}
