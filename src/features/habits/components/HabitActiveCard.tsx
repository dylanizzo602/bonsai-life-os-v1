/* HabitActiveCard: Material habit card with streak and Target/Minimum/Skip actions */

import { MaterialIcon } from '../../../components/MaterialIcon'
import type { HabitEntry, HabitWithStreaks } from '../types'
import { formatHabitStreakCount } from '../formatHabitStreak'

export interface HabitActiveCardProps {
  habit: HabitWithStreaks
  entriesByHabit: Record<string, HabitEntry[]>
  selectedDateYMD: string
  isScheduled: boolean
  onSetEntry: (
    habitId: string,
    entryDate: string,
    status: 'completed' | 'minimum' | 'skipped' | null,
  ) => Promise<void>
  onEditHabit: (habit: HabitWithStreaks) => void
  /** When true, Target/Min/Skip actions are disabled (vacation mode) */
  markingDisabled?: boolean
}

/** Resolve entry status for a habit on the selected date */
function getStatusForDate(
  entriesByHabit: Record<string, HabitEntry[]>,
  habitId: string,
  ymd: string,
): 'completed' | 'minimum' | 'skipped' | null {
  const entries = entriesByHabit[habitId] ?? []
  const e = entries.find((x) => x.entry_date === ymd)
  return e ? e.status : null
}

/**
 * Active habit card for the habits grid.
 */
export function HabitActiveCard({
  habit,
  entriesByHabit,
  selectedDateYMD,
  isScheduled,
  onSetEntry,
  onEditHabit,
  markingDisabled = false,
}: HabitActiveCardProps) {
  /* Selected-day status drives button active states */
  const status = isScheduled ? getStatusForDate(entriesByHabit, habit.id, selectedDateYMD) : null
  const hasMinimumAction = Boolean(habit.minimum_action && habit.minimum_action.trim() !== '')
  const actionsDisabled = !isScheduled || markingDisabled

  return (
    <div
      className={`group rounded-xl border bg-surface-container-lowest p-6 transition-all duration-300 hover:shadow-lg ${
        isScheduled
          ? 'border-outline-variant/20'
          : 'border-outline-variant/20 opacity-60'
      }`}
    >
      {/* Header: name, streak, settings */}
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-semibold text-on-surface transition-colors group-hover:text-primary">
            {habit.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <MaterialIcon name="local_fire_department" className="text-[16px] text-primary" filled />
            <span className="text-secondary text-on-surface-variant">
              {formatHabitStreakCount(habit, habit.currentStreak)} Streak
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEditHabit(habit)}
          className="shrink-0 rounded-full p-1 text-on-surface-variant/40 transition-colors hover:text-primary"
          aria-label="Edit habit"
        >
          <MaterialIcon name="more_vert" />
        </button>
      </div>

      {/* Entry actions: Target, Minimum, Skip */}
      <div className={`grid gap-2 ${hasMinimumAction ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() =>
            void onSetEntry(
              habit.id,
              selectedDateYMD,
              status === 'completed' ? null : 'completed',
            )
          }
          className={`rounded-md border px-1 py-2 text-secondary font-bold transition-all ${
            actionsDisabled
              ? 'cursor-not-allowed border-outline-variant/20 text-outline'
              : status === 'completed'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant/40 hover:border-primary hover:bg-primary hover:text-on-primary'
          }`}
        >
          Target
        </button>
        {hasMinimumAction && (
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() =>
              void onSetEntry(
                habit.id,
                selectedDateYMD,
                status === 'minimum' ? null : 'minimum',
              )
            }
            className={`rounded-md border px-1 py-2 text-secondary font-bold transition-all ${
              actionsDisabled
                ? 'cursor-not-allowed border-outline-variant/20 text-outline'
                : status === 'minimum'
                  ? 'border-secondary-container bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant/40 hover:border-secondary-container hover:bg-secondary-container hover:text-on-secondary-container'
            }`}
          >
            Minimum
          </button>
        )}
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() =>
            void onSetEntry(
              habit.id,
              selectedDateYMD,
              status === 'skipped' ? null : 'skipped',
            )
          }
          className={`rounded-md border px-1 py-2 text-secondary font-bold transition-all ${
            actionsDisabled
              ? 'cursor-not-allowed border-outline-variant/20 text-outline'
              : status === 'skipped'
                ? 'border-error-container bg-error-container text-on-error-container'
                : 'border-outline-variant/40 hover:border-error-container hover:bg-error-container hover:text-on-error-container'
          }`}
        >
          Skip
        </button>
      </div>

      {!isScheduled && !markingDisabled && (
        <p className="mt-2 text-secondary text-on-surface-variant">Not scheduled for this day.</p>
      )}
      {markingDisabled && isScheduled && (
        <p className="mt-2 text-secondary text-on-surface-variant">Paused during vacation mode.</p>
      )}
    </div>
  )
}
