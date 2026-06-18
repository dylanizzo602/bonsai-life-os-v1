/* Briefing step ids: dynamic morning briefing flow sequence */

/** Ordered step identifiers for the morning briefing flow */
export type BriefingStepId =
  | 'greeting'
  | 'review'
  /** Preview-only: yesterday-in-review branch (no missed items) */
  | 'reviewYesterday'
  /** Preview-only: missed-items catch-up branch */
  | 'reviewMissed'
  | 'undergrowth'
  | 'inbox'
  | 'plan'
  | 'goalReview'
  | 'habitReview'
  | 'memorableMoment'
  | 'gratitude'
  | 'completion'

/** Inputs used to compute which optional steps appear (fixed for the session once resolved) */
export interface BriefingStepContext {
  isSunday: boolean
  hasMissedItems: boolean
  hasUndergrowthTasks: boolean
  hasInboxItems: boolean
  hasActiveGoals: boolean
  hasSkippedHabitsYesterday: boolean
}

/**
 * Build the ordered step list for this briefing session.
 * Review step id covers both YesterdayInReview and MissedItems branches in the UI.
 */
export function buildBriefingSteps(ctx: BriefingStepContext): BriefingStepId[] {
  const steps: BriefingStepId[] = ['greeting', 'review']

  if (ctx.isSunday && ctx.hasUndergrowthTasks) {
    steps.push('undergrowth')
  }

  if (ctx.hasInboxItems) {
    steps.push('inbox')
  }

  steps.push('plan')

  if (ctx.isSunday && ctx.hasActiveGoals) {
    steps.push('goalReview')
  }

  if (ctx.hasSkippedHabitsYesterday) {
    steps.push('habitReview')
  }

  steps.push('memorableMoment', 'gratitude', 'completion')
  return steps
}

/**
 * Full preview tour: every screen and branch (both review paths, Sunday steps, optional catch-up).
 * Used only in briefing preview mode — does not persist responses.
 */
export function buildPreviewBriefingSteps(): BriefingStepId[] {
  return [
    'greeting',
    'reviewYesterday',
    'reviewMissed',
    'undergrowth',
    'inbox',
    'plan',
    'goalReview',
    'habitReview',
    'memorableMoment',
    'gratitude',
    'completion',
  ]
}

/** Progress percent from current position in the step list */
export function getBriefingPercentComplete(
  stepId: BriefingStepId,
  stepIndex: number,
  totalSteps: number,
): number {
  if (stepId === 'completion') return 100
  if (totalSteps <= 0) return 0
  return Math.min(100, Math.round(((stepIndex + 1) / totalSteps) * 100))
}
