/* GoalCompletionReflectionModal: Memorable-moment-style prompt when a goal reaches 100% */

import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { BriefingTextarea } from '../../briefings/components/BriefingTextarea'
import { getDailyQuote } from '../../../lib/inspirationalQuotes'
import {
  GOAL_REFLECTION_SUCCESS_HINT,
  GOAL_REFLECTION_SUCCESS_QUESTION,
} from '../constants/goalReflection'

interface GoalCompletionReflectionModalProps {
  isOpen: boolean
  goalName: string
  value: string
  onChange: (value: string) => void
  onSave: () => void | Promise<void>
  onSkip: () => void
  saving?: boolean
}

/**
 * Full-screen reflection prompt shown after goal completion.
 * Layout mirrors the daily briefing memorable moment step.
 */
export function GoalCompletionReflectionModal({
  isOpen,
  goalName,
  value,
  onChange,
  onSave,
  onSkip,
  saving = false,
}: GoalCompletionReflectionModalProps) {
  const canSave = value.trim().length > 0 && !saving
  const dailyQuote = getDailyQuote()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      fullScreenOnMobile
      disableBodyScroll
      closeOnBackdropClick={false}
      overlayClassName="bg-surface/95 backdrop-blur-sm"
      cardClassName="max-w-2xl w-full bg-surface shadow-none border-0 md:rounded-xl"
      headerClassName="px-4 pt-4 md:px-6 md:pt-6"
      bodyClassName="flex-1 overflow-y-auto px-4 md:px-6"
      footerClassName="px-4 pb-4 md:px-6 md:pb-6"
      header={
        <div className="relative mb-6 text-center">
          <button
            type="button"
            onClick={onSkip}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
            aria-label="Skip reflection"
          >
            <span className="text-secondary font-medium text-on-surface-variant">Skip</span>
          </button>
          <p className="text-secondary mb-2 text-xs font-bold uppercase tracking-wider text-primary">
            Goal Complete
          </p>
          <h1 className="text-page-title font-semibold text-on-surface">{goalName}</h1>
          <p className="text-body mt-2 text-on-surface-variant">
            Take a moment to reflect on what made this achievement possible.
          </p>
        </div>
      }
      footer={
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onSkip} disabled={saving}>
            Skip for now
          </Button>
          <Button type="button" variant="primary" onClick={() => void onSave()} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save reflection'}
          </Button>
        </div>
      }
    >
      {/* Hero image: same visual language as memorable moment briefing step */}
      <div className="relative mb-10 h-64 w-full overflow-hidden rounded-xl">
        <img
          src="/images/reflection-hero.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
      </div>

      {/* Inspirational quote */}
      <div className="mb-10 text-center">
        <p className="text-body mx-auto max-w-lg italic text-on-surface-variant">
          &ldquo;{dailyQuote.text}&rdquo;
        </p>
      </div>

      {/* Reflection prompt */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6 md:p-8">
        <label
          htmlFor="goal-completion-reflection"
          className="text-body mb-2 block font-medium text-on-surface"
        >
          {GOAL_REFLECTION_SUCCESS_QUESTION}
        </label>
        <BriefingTextarea
          id="goal-completion-reflection"
          value={value}
          onChange={onChange}
          variant="minimal"
          placeholder="What helped you cross the finish line…"
          rows={4}
        />
        <p className="text-secondary mt-3 text-on-surface-variant">{GOAL_REFLECTION_SUCCESS_HINT}</p>
      </div>
    </Modal>
  )
}
