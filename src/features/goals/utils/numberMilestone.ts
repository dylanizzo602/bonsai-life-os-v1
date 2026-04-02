/* Number milestone helpers: shared completion rules for increasing vs decreasing targets */
import type { GoalMilestone } from '../types'

/**
 * True when start and target are set and the milestone moves toward a lower number
 * (e.g. weight loss: start 200 lbs, target 180 lbs).
 */
export function isNumberMilestoneDecreasing(m: GoalMilestone): boolean {
  return (
    m.type === 'number' &&
    m.start_value != null &&
    m.target_value != null &&
    m.target_value < m.start_value
  )
}

/**
 * Whether a number milestone has reached its target.
 * Decreasing targets: complete when current is at or below target.
 * Increasing (or unset start): complete when current is at or above target.
 */
export function isNumberMilestoneMet(m: GoalMilestone): boolean {
  if (m.type !== 'number') return false
  if (m.current_value == null || m.target_value == null) return false
  if (isNumberMilestoneDecreasing(m)) {
    return m.current_value <= m.target_value
  }
  return m.current_value >= m.target_value
}
