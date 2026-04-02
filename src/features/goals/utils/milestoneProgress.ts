/* Milestone progress: per-milestone 0–100% rules aggregated into goal progress (equal weight average) */
import type { Task } from '../../tasks/types'
import type { GoalMilestone } from '../types'
import { isNumberMilestoneDecreasing, isNumberMilestoneMet } from './numberMilestone'

/** Clamp a raw percentage to 0–100 */
function clampPercent(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Boolean milestone: 100% when completed, otherwise 0%.
 */
export function getBooleanMilestoneProgressPercent(m: GoalMilestone): number {
  if (m.type !== 'boolean') return 0
  return m.completed ? 100 : 0
}

/**
 * Number milestone: linear progress from start to target using current (or start when current unset).
 * Decreasing targets (target below start): progress rises as current falls toward target.
 * If start or target is missing, falls back to 100% only when fully met, else 0%.
 */
export function getNumberMilestoneProgressPercent(m: GoalMilestone): number {
  if (m.type !== 'number') return 0
  if (m.start_value == null || m.target_value == null) {
    return isNumberMilestoneMet(m) ? 100 : 0
  }
  const start = m.start_value
  const target = m.target_value
  const current = m.current_value ?? m.start_value
  const range = Math.abs(target - start)
  if (range < 1e-9) {
    return Math.abs(current - target) < 1e-9 ? 100 : 0
  }
  if (isNumberMilestoneDecreasing(m)) {
    return clampPercent(((start - current) / (start - target)) * 100)
  }
  return clampPercent(((current - start) / (target - start)) * 100)
}

/**
 * Tasks included in milestone progress (exclude soft-deleted rows).
 */
function isTaskCountedForMilestoneProgress(t: Task): boolean {
  return t.status !== 'deleted'
}

/**
 * Task milestone: completed tasks divided by all counted tasks in the linked root + descendant tree.
 */
export function getTaskMilestoneProgressPercentFromTree(tasks: Task[]): number {
  const counted = tasks.filter(isTaskCountedForMilestoneProgress)
  if (counted.length === 0) return 0
  const done = counted.filter((t) => t.status === 'completed').length
  return Math.round((done / counted.length) * 100)
}

/**
 * Single milestone progress when task tree is pre-fetched (task type) or omitted (other types).
 */
export function getMilestoneProgressPercent(
  m: GoalMilestone,
  taskTree: Task[] | undefined,
): number {
  if (m.type === 'boolean') return getBooleanMilestoneProgressPercent(m)
  if (m.type === 'number') return getNumberMilestoneProgressPercent(m)
  if (m.type === 'task') {
    if (!taskTree || taskTree.length === 0) return 0
    return getTaskMilestoneProgressPercentFromTree(taskTree)
  }
  return 0
}

/**
 * Goal-level progress: average of each milestone’s 0–100% (matches server calculateProgressFromMilestones).
 */
export function aggregateGoalProgressPercent(
  milestones: GoalMilestone[],
  taskTreesByMilestoneId: Record<string, Task[]>,
): number {
  if (milestones.length === 0) return 0
  const parts = milestones.map((m) =>
    getMilestoneProgressPercent(m, taskTreesByMilestoneId[m.id]),
  )
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

/**
 * Count milestones that are fully complete (100% by the rules above).
 */
export function countFullyCompleteMilestones(
  milestones: GoalMilestone[],
  taskTreesByMilestoneId: Record<string, Task[]>,
): number {
  return milestones.filter((m) => {
    const p = getMilestoneProgressPercent(m, taskTreesByMilestoneId[m.id])
    return p >= 100
  }).length
}
