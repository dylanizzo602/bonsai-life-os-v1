/* useMorningBriefingBanner: Whether to show "finish your morning briefing" banner on home */

import { useState, useEffect, useCallback } from 'react'
import { getHasCompletedMorningBriefingToday } from '../../../lib/supabase/reflections'
import {
  dismissMorningBriefingToday,
  isMorningBriefingDismissedToday,
} from '../../notifications/dismissedInAppNotifications'
import { useUserTimeZone } from '../../settings/useUserTimeZone'

/**
 * Returns whether to show the morning briefing banner, and a dismiss handler.
 * Banner shows when user has not completed today's briefing and has not dismissed for today.
 */
export function useMorningBriefingBanner() {
  const [completedToday, setCompletedToday] = useState<boolean | null>(null)
  const [dismissedToday, setDismissedToday] = useState(false)
  /* Timezone: align the “completed today” banner with the user's zoned calendar day */
  const timeZone = useUserTimeZone()

  /* Check completed and dismissed on mount */
  useEffect(() => {
    let cancelled = false
    getHasCompletedMorningBriefingToday(timeZone).then((completed) => {
      if (!cancelled) setCompletedToday(completed)
    })
    setDismissedToday(isMorningBriefingDismissedToday(timeZone))
    return () => {
      cancelled = true
    }
  }, [timeZone])

  const dismiss = useCallback(() => {
    dismissMorningBriefingToday(timeZone)
    setDismissedToday(true)
  }, [timeZone])

  const showBanner = completedToday === false && !dismissedToday
  const needsMorningBriefing = completedToday === false
  const hasCompletedMorningBriefingToday = completedToday === true

  return {
    showBanner,
    dismiss,
    /** True when today's morning briefing is not finished yet */
    needsMorningBriefing,
    /** True when today's morning briefing is done */
    hasCompletedMorningBriefingToday,
    /** True while completion status is loading */
    isLoading: completedToday === null,
  }
}
