/* useGoalIdentities hook: load identity categories + 3 slot assignments; coordinate slot edits and goal visibility sync */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { IdentityWithSlots } from '../../../lib/supabase/identities'
import {
  getIdentitiesWithSlots,
  replaceIdentitySlot,
  clearIdentitySlot,
  setIdentityFocus,
  setCurrentIdentityGoalsActive,
  updateIdentityBadge,
  updateIdentityDetails,
} from '../../../lib/supabase/identities'
import { uploadIdentityBadge } from '../../../lib/supabase/storage'

export interface UseGoalIdentities {
  identities: IdentityWithSlots[]
  loading: boolean
  error: string | null

  refetch: () => Promise<void>

  toggleIdentityFocus: (identityId: string, nextIsActive: boolean) => Promise<void>

  setSlotHabit: (identityId: string, slotIndex: 0 | 1 | 2, habitId: string) => Promise<void>
  setSlotGoal: (identityId: string, slotIndex: 0 | 1 | 2, goalId: string) => Promise<void>

  completeGoalInSlot: (identityId: string, slotIndex: 0 | 1 | 2) => Promise<void>

  updateIdentityCopy: (identityId: string, input: { name?: string; description?: string }) => Promise<void>

  uploadBadge: (identityId: string, file: File) => Promise<void>

  /** Derived list used by UI for Active-group limit checks */
  activeIdentityCount: number
  /** UI helper: used to disable identity activation when max is reached */
  canEnableMoreActiveIdentities: boolean
}

const MAX_ACTIVE_IDENTITIES = 4

export function useGoalIdentities(): UseGoalIdentities {
  const [identities, setIdentities] = useState<IdentityWithSlots[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getIdentitiesWithSlots()
      setIdentities(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identities')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refetch = useCallback(async () => {
    await load()
  }, [load])

  const activeIdentityCount = useMemo(
    () => identities.filter((i) => i.identity.is_active).length,
    [identities],
  )

  const canEnableMoreActiveIdentities = useMemo(
    () => activeIdentityCount < MAX_ACTIVE_IDENTITIES,
    [activeIdentityCount],
  )

  const toggleIdentityFocus = useCallback(
    async (identityId: string, nextIsActive: boolean) => {
      const existing = identities.find((i) => i.identity.id === identityId)
      if (!existing) return

      if (nextIsActive && !existing.identity.is_active && !canEnableMoreActiveIdentities) {
        throw new Error(`You can have up to ${MAX_ACTIVE_IDENTITIES} active identities.`)
      }

      try {
        setError(null)
        await setIdentityFocus(identityId, nextIsActive)
        // Sync goal visibility for any currently assigned goal slots.
        await setCurrentIdentityGoalsActive(identityId, nextIsActive)
        await refetch()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update identity focus')
        throw err
      }
    },
    [identities, canEnableMoreActiveIdentities, refetch],
  )

  const setSlotHabit = useCallback(
    async (identityId: string, slotIndex: 0 | 1 | 2, habitId: string) => {
      try {
        setError(null)
        const identity = identities.find((i) => i.identity.id === identityId)
        const identityIsActive = identity?.identity.is_active ?? false

        void identityIsActive // habit slots don't change goals.is_active directly

        await replaceIdentitySlot(identityId, slotIndex, { itemType: 'habit', habitId })
        await refetch()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set habit slot')
        throw err
      }
    },
    [identities, refetch],
  )

  const setSlotGoal = useCallback(
    async (identityId: string, slotIndex: 0 | 1 | 2, goalId: string) => {
      try {
        setError(null)
        const identity = identities.find((i) => i.identity.id === identityId)
        const identityIsActive = identity?.identity.is_active ?? false

        await replaceIdentitySlot(identityId, slotIndex, {
          itemType: 'goal',
          goalId,
          setGoalActive: identityIsActive,
        })
        await refetch()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set goal slot')
        throw err
      }
    },
    [identities, refetch],
  )

  const completeGoalInSlot = useCallback(
    async (identityId: string, slotIndex: 0 | 1 | 2) => {
      try {
        setError(null)
        await clearIdentitySlot(identityId, slotIndex)
        await refetch()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete goal')
        throw err
      }
    },
    [refetch],
  )

  const updateIdentityCopy = useCallback(
    async (identityId: string, input: { name?: string; description?: string }) => {
      try {
        setError(null)
        await updateIdentityDetails(identityId, input)
        await refetch()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update identity')
        throw err
      }
    },
    [refetch],
  )

  const uploadBadge = useCallback(
    async (identityId: string, file: File) => {
      try {
        setError(null)
        const uploaded = await uploadIdentityBadge(identityId, file)
        await updateIdentityBadge(identityId, {
          badgeStoragePath: uploaded.storagePath,
          badgeUrl: uploaded.url,
        })
        await refetch()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload badge')
        throw err
      }
    },
    [refetch],
  )

  return {
    identities,
    loading,
    error,
    refetch,
    toggleIdentityFocus,
    setSlotHabit,
    setSlotGoal,
    completeGoalInSlot,
    updateIdentityCopy,
    uploadBadge,
    activeIdentityCount,
    canEnableMoreActiveIdentities,
  }
}

