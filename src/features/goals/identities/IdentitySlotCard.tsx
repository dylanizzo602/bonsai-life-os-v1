/* IdentitySlotCard: one of the 3 identity slots (habit or goal) with actions */

import type { IdentitySlotResolved } from '../../../lib/supabase/identities'
import type { HabitColorId } from '../../habits/types'

export interface IdentitySlotCardProps {
  slot: IdentitySlotResolved | null
  slotIndex: 0 | 1 | 2
  identityIsActive: boolean

  onOpenPicker: () => void
  onOpenGoal: (goalId: string) => void
  onCompleteGoal: () => void
}

const HABIT_COLOR_CLASS: Record<HabitColorId, { bg: string; text: string }> = {
  orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
  yellow: { bg: 'bg-yellow-100', text: 'text-amber-900' },
  green: { bg: 'bg-green-100', text: 'text-green-800' },
  light_blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
  dark_blue: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800' },
  red: { bg: 'bg-red-100', text: 'text-red-800' },
  grey: { bg: 'bg-bonsai-slate-100', text: 'text-bonsai-slate-700' },
}

export function IdentitySlotCard({
  slot,
  slotIndex,
  identityIsActive,
  onOpenPicker,
  onOpenGoal,
  onCompleteGoal,
}: IdentitySlotCardProps) {
  const slotLabel = `Slot ${slotIndex + 1}`

  return (
    <div className="rounded-lg border border-bonsai-slate-200 bg-white p-3 md:p-4">
      {/* Slot header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-secondary font-medium text-bonsai-slate-700">{slotLabel}</p>

        {identityIsActive ? (
          <button
            type="button"
            className="text-secondary font-medium text-bonsai-sage-700 hover:underline"
            onClick={onOpenPicker}
            aria-label="Assign slot"
          >
            {slot ? 'Change' : 'Add'}
          </button>
        ) : (
          <span className="text-secondary text-bonsai-slate-500">Locked</span>
        )}
      </div>

      {/* Slot body */}
      {!slot ? (
        <p className="text-secondary text-bonsai-slate-500">No item assigned.</p>
      ) : slot.item_type === 'habit' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full border border-bonsai-slate-200 ${
                slot.habit?.color && HABIT_COLOR_CLASS[slot.habit.color]
                  ? `${HABIT_COLOR_CLASS[slot.habit.color].bg} ${HABIT_COLOR_CLASS[slot.habit.color].text}`
                  : 'bg-bonsai-slate-50 text-bonsai-slate-700'
              }`}
              aria-hidden="true"
            >
              H
            </span>
            <div className="min-w-0">
              <p className="text-body font-semibold text-bonsai-brown-700 truncate">{slot.habit?.name}</p>
              <p className="text-secondary text-bonsai-slate-600 text-xs mt-0.5">Habit</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-body font-semibold text-bonsai-brown-700 truncate">{slot.goal?.name}</p>
              <p className="text-secondary text-bonsai-slate-600 text-xs mt-0.5">
                Goal • {slot.goal?.progress ?? 0}%
              </p>
            </div>
            {slot.goal?.is_active !== false ? (
              <span className="inline-flex items-center rounded-full bg-bonsai-sage-50 px-2 py-1 text-secondary text-bonsai-sage-700 font-medium text-xs">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-bonsai-slate-50 px-2 py-1 text-secondary text-bonsai-slate-600 font-medium text-xs">
                Archived
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-secondary font-medium text-bonsai-sage-700 hover:underline"
              onClick={() => slot.goal?.id && onOpenGoal(slot.goal.id)}
              aria-label="Open goal details"
            >
              View
            </button>

            {identityIsActive && slot.goal?.is_active !== false && (
              <button
                type="button"
                className="rounded-lg bg-bonsai-slate-50 border border-bonsai-slate-200 px-3 py-1.5 text-secondary font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-100 transition-colors"
                onClick={onCompleteGoal}
              >
                Complete & archive
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

