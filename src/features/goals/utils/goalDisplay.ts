/* Goal display helpers: accents, icons, progress labels, inactive status, completed tree assets */
import type { Task } from '../../tasks/types'
import type { Goal, GoalMilestone } from '../types'
import {
  countFullyCompleteMilestones,
  getNumberMilestoneProgressPercent,
} from './milestoneProgress'

/** Accent variants cycling across active goal cards (matches mock primary / secondary / tertiary) */
export type GoalAccent = 'primary' | 'secondary' | 'tertiary'

const ACCENT_CYCLE: GoalAccent[] = ['primary', 'secondary', 'tertiary']

const TREE_ASSET_COUNT = 5

/** Tailwind class groups per accent for card icon tile, badge, and progress bar */
export const GOAL_ACCENT_CLASSES: Record<
  GoalAccent,
  {
    iconTile: string
    iconTileHover: string
    badge: string
    bar: string
  }
> = {
  primary: {
    iconTile: 'bg-primary/10 text-primary',
    iconTileHover: 'group-hover:bg-primary group-hover:text-on-primary',
    badge: 'bg-primary/10 text-primary',
    bar: 'bg-primary',
  },
  secondary: {
    iconTile: 'bg-secondary/10 text-secondary',
    iconTileHover: 'group-hover:bg-secondary group-hover:text-on-secondary',
    badge: 'bg-secondary/10 text-secondary',
    bar: 'bg-secondary',
  },
  tertiary: {
    iconTile: 'bg-tertiary/10 text-tertiary',
    iconTileHover: 'group-hover:bg-tertiary group-hover:text-on-tertiary',
    badge: 'bg-tertiary/10 text-tertiary',
    bar: 'bg-tertiary',
  },
}

/**
 * Pick accent variant by card index (cycles primary → secondary → tertiary).
 */
export function getGoalAccent(index: number): GoalAccent {
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length] ?? 'primary'
}

/**
 * Material icon name for a goal based on name keywords and index fallback.
 */
export function getGoalMaterialIcon(goal: Pick<Goal, 'name'>, index: number): string {
  const n = goal.name.toLowerCase()
  if (n.includes('book') || n.includes('poetry') || n.includes('write') || n.includes('read')) {
    return 'menu_book'
  }
  if (
    n.includes('fitness') ||
    n.includes('marathon') ||
    n.includes('run') ||
    n.includes('train') ||
    n.includes('workout')
  ) {
    return 'fitness_center'
  }
  if (
    n.includes('language') ||
    n.includes('japanese') ||
    n.includes('learn') ||
    n.includes('study')
  ) {
    return 'language'
  }
  if (n.includes('meditat')) return 'self_improvement'
  if (n.includes('design') || n.includes('portfolio')) return 'palette'
  const defaults = ['menu_book', 'fitness_center', 'language', 'eco', 'park']
  return defaults[index % defaults.length] ?? 'eco'
}

/**
 * Hash a goal id to a stable integer for asset rotation.
 */
function hashGoalId(goalId: string): number {
  let hash = 0
  for (let i = 0; i < goalId.length; i++) {
    hash = (hash * 31 + goalId.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Completed forest tree image path, rotated deterministically by goal id.
 */
export function getCompletedGoalTreeSrc(goalId: string): string {
  const index = (hashGoalId(goalId) % TREE_ASSET_COUNT) + 1
  return `/goals/trees/tree-${index}.svg`
}

/**
 * Human-readable progress label for the active goal card footer.
 */
export function getGoalProgressLabel(
  milestones: GoalMilestone[],
  taskTreesByMilestoneId: Record<string, Task[]>,
): string {
  /* Number milestone: prefer first with target for "current / target unit" */
  const numberMilestone = milestones.find(
    (m) => m.type === 'number' && m.target_value != null,
  )
  if (numberMilestone) {
    const start = numberMilestone.start_value ?? 0
    const current = numberMilestone.current_value ?? start
    const target = numberMilestone.target_value ?? 0
    const unit = numberMilestone.unit?.trim()
    const valuePart = `${formatProgressNumber(current)} / ${formatProgressNumber(target)}`
    return unit ? `${valuePart} ${unit}` : valuePart
  }

  /* Task milestones: sum completed vs total tasks across all linked trees */
  const taskMilestones = milestones.filter((m) => m.type === 'task')
  if (taskMilestones.length > 0) {
    let done = 0
    let total = 0
    for (const m of taskMilestones) {
      const tree = taskTreesByMilestoneId[m.id] ?? []
      const counted = tree.filter((t) => t.status !== 'deleted')
      done += counted.filter((t) => t.status === 'completed').length
      total += counted.length
    }
    if (total > 0) {
      return `${done} / ${total} Tasks`
    }
  }

  /* Fallback: fully complete milestones vs total */
  const completed = countFullyCompleteMilestones(milestones, taskTreesByMilestoneId)
  const total = milestones.length
  if (total > 0) {
    return `${completed} / ${total} Milestones`
  }

  return '0%'
}

/**
 * Progress percent + label for ActiveGoalCard; percent always matches the footer metric.
 */
export function getActiveGoalCardProgress(
  milestones: GoalMilestone[],
  taskTreesByMilestoneId: Record<string, Task[]>,
  fallbackProgress: number,
): { percent: number; label: string } {
  const label = getGoalProgressLabel(milestones, taskTreesByMilestoneId)

  if (milestones.length === 0) {
    return {
      percent: Math.round(Math.min(100, Math.max(0, fallbackProgress))),
      label,
    }
  }

  /* Number milestone label: use the same primary milestone's percent (not goal aggregate) */
  const primaryNumber = milestones.find(
    (m) => m.type === 'number' && m.target_value != null,
  )
  if (primaryNumber) {
    return {
      percent: getNumberMilestoneProgressPercent(primaryNumber),
      label,
    }
  }

  /* Task milestone label: completed tasks / total tasks */
  const taskMilestones = milestones.filter((m) => m.type === 'task')
  if (taskMilestones.length > 0) {
    let done = 0
    let total = 0
    for (const m of taskMilestones) {
      const tree = taskTreesByMilestoneId[m.id] ?? []
      const counted = tree.filter((t) => t.status !== 'deleted')
      done += counted.filter((t) => t.status === 'completed').length
      total += counted.length
    }
    if (total > 0) {
      return { percent: Math.round((done / total) * 100), label }
    }
  }

  /* Milestone count label: fully complete / total milestones */
  const completed = countFullyCompleteMilestones(milestones, taskTreesByMilestoneId)
  const total = milestones.length
  if (total > 0) {
    return { percent: Math.round((completed / total) * 100), label }
  }

  return {
    percent: Math.round(Math.min(100, Math.max(0, fallbackProgress))),
    label,
  }
}

function formatProgressNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace(/\.0$/, '')
}

/** Whether a goal's start date is in the future (scheduled, not yet started). */
export function isGoalScheduled(goal: Pick<Goal, 'start_date'>): boolean {
  if (!goal.start_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(goal.start_date + 'T12:00:00')
  return start > today
}

/**
 * Inactive goal status line (uppercase-friendly subtitle).
 */
export function getInactiveGoalStatus(goal: Pick<Goal, 'start_date'>): string {
  if (isGoalScheduled(goal)) {
    const start = new Date(goal.start_date! + 'T12:00:00')
    const monthYear = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `Scheduled · Starts ${monthYear}`
  }
  return 'Paused'
}

/**
 * Format completion month for completed forest labels (e.g. "Oct 2023").
 */
export function formatGoalCompletionMonth(goal: Pick<Goal, 'updated_at' | 'target_date'>): string {
  const raw = goal.target_date ?? goal.updated_at
  if (!raw) return ''
  const d = goal.target_date
    ? new Date(goal.target_date + 'T12:00:00')
    : new Date(raw)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Resolve display progress percent for bucketing and cards.
 */
export function resolveGoalProgressPercent(
  goal: Goal,
  milestones: GoalMilestone[] | undefined,
  taskTreesByMilestoneId: Record<string, Task[]>,
  aggregateProgress: (ms: GoalMilestone[], trees: Record<string, Task[]>) => number,
): number {
  if (milestones !== undefined) {
    return aggregateProgress(milestones, taskTreesByMilestoneId)
  }
  return Math.round(Math.min(100, Math.max(0, goal.progress ?? 0)))
}
