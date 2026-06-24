/* vacationMode data access: persist habit vacation mode in auth user_metadata */

import { supabase } from './client'

export interface UpdateVacationModeInput {
  /** Whether vacation mode scheduling is enabled */
  enabled: boolean
  /** Inclusive start date YYYY-MM-DD; null when disabled */
  start: string | null
  /** Inclusive end date YYYY-MM-DD; null when disabled */
  end: string | null
}

/** Persist vacation mode fields on the signed-in user's auth metadata */
export async function updateVacationModeMetadata(input: UpdateVacationModeInput): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      vacation_mode_enabled: input.enabled,
      vacation_mode_start: input.start,
      vacation_mode_end: input.end,
    },
  })

  if (error) {
    console.error('Error updating vacation mode metadata:', error)
    throw error
  }
}

/** Clear expired or disabled vacation mode from auth metadata */
export async function clearVacationModeMetadata(): Promise<void> {
  await updateVacationModeMetadata({ enabled: false, start: null, end: null })
}
