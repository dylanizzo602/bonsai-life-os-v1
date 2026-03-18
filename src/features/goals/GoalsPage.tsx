/* Goals page: 8-category identity/badge view with 3 active slots per identity */

import { useMemo, useState } from 'react'
import { GoalDetailPage } from './GoalDetailPage'
import { useGoalIdentities } from './hooks/useGoalIdentities'
import type { IdentitySlotResolved } from '../../lib/supabase/identities'
import { IdentityCategoryRow } from './identities/IdentityCategoryRow'
import { IdentitySlotPickerModal } from './identities/IdentitySlotPickerModal'

/**
 * Goals page component.
 * Replaced from the legacy goal-gauge grid with an identity-driven layout.
 */
export function GoalsPage() {
  const {
    identities,
    loading,
    error,
    refetch,
    toggleIdentityFocus,
    setSlotHabit,
    setSlotGoal,
    completeGoalInSlot,
    uploadBadge,
    updateIdentityCopy,
    activeIdentityCount,
    canEnableMoreActiveIdentities,
  } = useGoalIdentities()

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerIdentityId, setPickerIdentityId] = useState<string | null>(null)
  const [pickerSlotIndex, setPickerSlotIndex] = useState<0 | 1 | 2>(0)

  const activeIdentities = useMemo(
    () => identities.filter((i) => i.identity.is_active),
    [identities],
  )
  const passiveIdentities = useMemo(
    () => identities.filter((i) => !i.identity.is_active),
    [identities],
  )

  const openPicker = (identityId: string, slotIndex: 0 | 1 | 2) => {
    setPickerIdentityId(identityId)
    setPickerSlotIndex(slotIndex)
    setPickerOpen(true)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setPickerIdentityId(null)
  }

  const pickerIdentityWithSlots = useMemo(() => {
    if (!pickerIdentityId) return null
    return identities.find((i) => i.identity.id === pickerIdentityId) ?? null
  }, [identities, pickerIdentityId])

  const currentPickerSlot = useMemo((): IdentitySlotResolved | null => {
    if (!pickerIdentityWithSlots) return null
    return pickerIdentityWithSlots.currentSlots[pickerSlotIndex] ?? null
  }, [pickerIdentityWithSlots, pickerSlotIndex])

  const handleOpenGoal = (goalId: string) => {
    setSelectedGoalId(goalId)
    setPickerOpen(false)
  }

  if (selectedGoalId) {
    return (
      <GoalDetailPage
        key={selectedGoalId}
        goalId={selectedGoalId}
        onBack={() => {
          setSelectedGoalId(null)
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="min-h-full">
      <div className="mb-6">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Goals</h1>
        <p className="text-secondary text-bonsai-slate-600 mt-1">
          Choose your identity focus. Each active identity has 3 slots for habits or goals, and completed goals remain available.
        </p>
      </div>

      {loading && <p className="text-body text-bonsai-slate-500 py-8">Loading identities…</p>}

      {error && (
        <p className="text-body text-red-600 py-2" role="alert">
          {error}
        </p>
      )}

      {!loading && (
        <div className="space-y-10">
          {/* Active identities */}
          <section>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="text-body font-semibold text-bonsai-brown-700">Active identities</h2>
                <p className="text-secondary text-bonsai-slate-600 mt-1">
                  Up to 4 active identities. Currently active: {activeIdentityCount}.
                </p>
              </div>
            </div>

            {activeIdentities.length === 0 ? (
              <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
                <p className="text-secondary text-bonsai-slate-600">
                  Toggle a category into Active to start filling its three slots.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeIdentities.map((identityWithSlots) => (
                  <IdentityCategoryRow
                    key={identityWithSlots.identity.id}
                    identityWithSlots={identityWithSlots}
                    showFocusToggle
                    focusToggleDisabled={false}
                    onToggleFocus={(nextIsActive) => toggleIdentityFocus(identityWithSlots.identity.id, nextIsActive)}
                    onUploadBadge={async (identityId, file) => uploadBadge(identityId, file)}
                    onOpenPicker={(slotIndex) => openPicker(identityWithSlots.identity.id, slotIndex)}
                    onOpenGoal={handleOpenGoal}
                    onCompleteGoal={(slotIndex) => completeGoalInSlot(identityWithSlots.identity.id, slotIndex)}
                    onUpdateIdentityCopy={updateIdentityCopy}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Passive identities */}
          <section>
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Passive identities</h2>

            <div className="space-y-4">
              {passiveIdentities.map((identityWithSlots) => {
                const isDisabled = !canEnableMoreActiveIdentities
                return (
                  <IdentityCategoryRow
                    key={identityWithSlots.identity.id}
                    identityWithSlots={identityWithSlots}
                    showFocusToggle
                    focusToggleDisabled={isDisabled}
                    onToggleFocus={(nextIsActive) =>
                      toggleIdentityFocus(identityWithSlots.identity.id, nextIsActive)
                    }
                    onUploadBadge={async (identityId, file) => uploadBadge(identityId, file)}
                    onOpenPicker={(slotIndex) => openPicker(identityWithSlots.identity.id, slotIndex)}
                    onOpenGoal={handleOpenGoal}
                    onCompleteGoal={(slotIndex) => completeGoalInSlot(identityWithSlots.identity.id, slotIndex)}
                    onUpdateIdentityCopy={updateIdentityCopy}
                  />
                )
              })}

              {passiveIdentities.length === 0 && (
                <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-4">
                  <p className="text-secondary text-bonsai-slate-600">All categories are currently active.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <IdentitySlotPickerModal
        key={`${pickerIdentityId ?? 'none'}-${pickerSlotIndex}-${currentPickerSlot?.item_type ?? 'empty'}-${currentPickerSlot?.habit?.id ?? ''}-${currentPickerSlot?.goal?.id ?? ''}`}
        isOpen={pickerOpen && !!pickerIdentityId}
        identityId={pickerIdentityId ?? ''}
        identityIsActive={pickerIdentityWithSlots?.identity.is_active ?? false}
        slotIndex={pickerSlotIndex}
        onClose={closePicker}
        currentSlot={currentPickerSlot}
        onAssignHabit={async (habitId) => {
          if (!pickerIdentityId) return
          await setSlotHabit(pickerIdentityId, pickerSlotIndex, habitId)
        }}
        onAssignGoal={async (goalId) => {
          if (!pickerIdentityId) return
          await setSlotGoal(pickerIdentityId, pickerSlotIndex, goalId)
        }}
      />
    </div>
  )
}
