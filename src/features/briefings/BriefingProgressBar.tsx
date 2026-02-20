/* BriefingProgressBar: Shows current step and total steps during briefing flow */

interface BriefingProgressBarProps {
  /** Current step (1-based for display) */
  currentStep: number
  /** Total number of steps in the flow */
  totalSteps: number
}

/**
 * Progress indicator for the briefing flow (e.g. "Step 2 of 8" and a bar).
 * Uses Bonsai palette and text-secondary for label.
 */
export function BriefingProgressBar({ currentStep, totalSteps }: BriefingProgressBarProps) {
  const percent = totalSteps > 0 ? Math.min(100, (currentStep / totalSteps) * 100) : 0

  return (
    <div className="mt-6 flex flex-col gap-2">
      {/* Label: Step X of Y */}
      <p className="text-secondary font-medium text-bonsai-slate-600">
        Step {currentStep} of {totalSteps}
      </p>
      {/* Bar: filled portion uses sage */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-bonsai-slate-200"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        <div
          className="h-full rounded-full bg-bonsai-sage-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
