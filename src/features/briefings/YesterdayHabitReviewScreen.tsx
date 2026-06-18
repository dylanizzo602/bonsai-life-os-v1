/* YesterdayHabitReviewScreen: Habit breakdown + reflection when habits were skipped */

import { MaterialIcon } from '../../components/MaterialIcon'
import { BriefingShell } from './components/BriefingShell'
import { BriefingTextarea } from './components/BriefingTextarea'
import type { HabitWithStreaks } from '../habits/types'

interface YesterdayHabitReviewScreenProps {
  completed: HabitWithStreaks[]
  missed: HabitWithStreaks[]
  gotInTheWay: string
  doDifferentlyToday: string
  onGotInTheWayChange: (value: string) => void
  onDoDifferentlyChange: (value: string) => void
  onBack?: () => void
  onClose?: () => void
}

/**
 * Habit skip review: completed vs missed breakdown plus two reflection prompts.
 */
export function YesterdayHabitReviewScreen({
  completed,
  missed,
  gotInTheWay,
  doDifferentlyToday,
  onGotInTheWayChange,
  onDoDifferentlyChange,
  onBack,
  onClose,
}: YesterdayHabitReviewScreenProps) {
  return (
    <BriefingShell>
      <div className="mx-auto max-w-2xl">
        <div className="relative mb-10 text-center">
          {onBack != null ? (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Go back"
            >
              <MaterialIcon name="arrow_back" className="text-on-surface-variant" />
            </button>
          ) : null}
          {onClose != null ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Close briefing"
            >
              <MaterialIcon name="close" className="text-on-surface-variant" />
            </button>
          ) : null}
          <p className="text-secondary mb-2 text-xs font-bold uppercase tracking-wider text-primary">
            Yesterday&apos;s Habits
          </p>
          <h1 className="text-page-title mb-3 font-semibold text-on-surface">
            Let&apos;s learn from yesterday.
          </h1>
          <p className="text-body text-on-surface-variant">
            A quick look at what you maintained — and what slipped through.
          </p>
        </div>

        {/* Habit breakdown grid */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
            <div className="mb-4 flex items-center gap-2">
              <MaterialIcon name="check_circle" className="text-primary" filled />
              <h2 className="text-body font-semibold text-on-surface">Completed</h2>
            </div>
            {completed.length === 0 ? (
              <p className="text-secondary text-on-surface-variant">None logged</p>
            ) : (
              <ul className="space-y-2">
                {completed.map((habit) => (
                  <li key={habit.id} className="text-body text-on-surface">
                    {habit.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
            <div className="mb-4 flex items-center gap-2">
              <MaterialIcon name="cancel" className="text-error" />
              <h2 className="text-body font-semibold text-on-surface">Missed</h2>
            </div>
            {missed.length === 0 ? (
              <p className="text-secondary text-on-surface-variant">None missed</p>
            ) : (
              <ul className="space-y-2">
                {missed.map((habit) => (
                  <li key={habit.id} className="text-body text-on-surface">
                    {habit.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Reflection card */}
        <div className="rounded-xl border border-primary/20 bg-primary-fixed/30 p-6 md:p-8">
          <h2 className="text-body mb-2 font-semibold text-on-surface">
            It looks like a few things were missed.
          </h2>
          <p className="text-secondary mb-6 text-on-surface-variant">
            Be kind to yourself — understanding patterns helps you grow.
          </p>

          <div className="mb-6">
            <label htmlFor="habits-got-in-the-way" className="text-secondary mb-2 block font-medium">
              What do you think got in the way yesterday?
            </label>
            <BriefingTextarea
              id="habits-got-in-the-way"
              value={gotInTheWay}
              onChange={onGotInTheWayChange}
              placeholder="Write your thoughts…"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="habits-do-differently" className="text-secondary mb-2 block font-medium">
              What can you do differently today to set yourself up for success?
            </label>
            <BriefingTextarea
              id="habits-do-differently"
              value={doDifferentlyToday}
              onChange={onDoDifferentlyChange}
              placeholder="One small change…"
              rows={3}
            />
          </div>
        </div>
      </div>
    </BriefingShell>
  )
}
