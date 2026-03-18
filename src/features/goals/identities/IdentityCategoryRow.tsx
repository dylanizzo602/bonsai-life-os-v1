/* IdentityCategoryRow: one category row with badge flip, 3 slots, and completed goals list */

import { useMemo, useState } from 'react'
import type { IdentityWithSlots } from '../../../lib/supabase/identities'
import { IdentityBadgeFlipCard } from './IdentityBadgeFlipCard'
import { IdentitySlotCard } from './IdentitySlotCard'
import { CompletedGoalsList } from './CompletedGoalsList'
import { IdentityEditModal } from './IdentityEditModal'
import { Button } from '../../../components/Button'

export interface IdentityCategoryRowProps {
  identityWithSlots: IdentityWithSlots
  showFocusToggle: boolean
  focusToggleDisabled: boolean
  onToggleFocus: (nextIsActive: boolean) => Promise<void>

  onUploadBadge: (identityId: string, file: File) => Promise<void>

  onOpenPicker: (slotIndex: 0 | 1 | 2) => void
  onOpenGoal: (goalId: string) => void
  onCompleteGoal: (slotIndex: 0 | 1 | 2) => void
  onUpdateIdentityCopy: (identityId: string, input: { name: string; description: string }) => Promise<void>
}

export function IdentityCategoryRow({
  identityWithSlots,
  showFocusToggle,
  focusToggleDisabled,
  onToggleFocus,
  onUploadBadge,
  onOpenPicker,
  onOpenGoal,
  onCompleteGoal,
  onUpdateIdentityCopy,
}: IdentityCategoryRowProps) {
  const { identity, currentSlots, pastCompletedGoals } = identityWithSlots
  const identityIsActive = identity.is_active

  const canUploadBadge = useMemo(() => identity.category !== 'other', [identity.category])
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="rounded-xl border border-bonsai-slate-200 bg-white p-4 md:p-6">
      {/* Header: badge + identity name + optional focus toggle */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div className="flex items-start gap-4">
          <IdentityBadgeFlipCard
            name={identity.name}
            badgeUrl={identity.badge_url}
            description={identity.description}
            flippable={identity.category !== 'other'}
            canUploadBadge={canUploadBadge}
            onUploadBadge={(file) => onUploadBadge(identity.id, file)}
          />

          <div className="pt-2">
            <h2 className="text-body font-bold text-bonsai-brown-700">{identity.name}</h2>
            <p className="text-secondary text-bonsai-slate-600 mt-1">
              {identity.category === 'other'
                ? identity.description
                : canUploadBadge
                  ? 'Badge identity'
                  : 'Flexible identity'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-start md:items-end">
          {showFocusToggle && (
            <div className="flex items-center gap-3">
              <span className="text-secondary text-bonsai-slate-600 font-medium">
                {identityIsActive ? 'Active' : 'Passive'}
              </span>
              <button
                type="button"
                disabled={focusToggleDisabled}
                onClick={() => {
                  void onToggleFocus(!identityIsActive).catch((err) => {
                    const message =
                      err instanceof Error ? err.message : 'Failed to update identity'
                    alert(message)
                  })
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  identityIsActive ? 'bg-bonsai-sage-600' : 'bg-bonsai-slate-300'
                } ${focusToggleDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-pressed={identityIsActive}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    identityIsActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="text-secondary"
          >
            Edit identity
          </Button>
        </div>
      </div>

      {/* 3 slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {[0, 1, 2].map((slotIndex) => {
          const resolved = currentSlots[slotIndex] ?? null
          return (
            <IdentitySlotCard
              key={slotIndex}
              slot={resolved}
              slotIndex={slotIndex as 0 | 1 | 2}
              identityIsActive={identityIsActive}
              onOpenPicker={() => onOpenPicker(slotIndex as 0 | 1 | 2)}
              onOpenGoal={(goalId) => onOpenGoal(goalId)}
              onCompleteGoal={() => onCompleteGoal(slotIndex as 0 | 1 | 2)}
            />
          )
        })}
      </div>

      {/* Completed goals */}
      <CompletedGoalsList goals={pastCompletedGoals} onOpenGoal={onOpenGoal} />

      <IdentityEditModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        identityName={identity.name}
        identityDescription={identity.description}
        onSave={async (input) => onUpdateIdentityCopy(identity.id, input)}
      />
    </div>
  )
}

