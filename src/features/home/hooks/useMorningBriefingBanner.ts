/* useMorningBriefingBanner: Whether to show "finish your morning briefing" banner on home */

import { useState, useEffect, useCallback } from 'react'
import { getHasCompletedMorningBriefingToday } from '../../../lib/supabase/reflections'
import { getTodayYMD } from '../../../lib/todaysLineup'
import { useUserTimeZone } from '../../settings/useUserTimeZone'

const DISMISS_KEY_PREFIX = 'bonsai-dismissed-morning-briefing-'

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
    const today = getTodayYMD()
    const key = DISMISS_KEY_PREFIX + today
    try {
      setDismissedToday(localStorage.getItem(key) === '1')
    } catch {
      setDismissedToday(false)
    }
    return () => {
      cancelled = true
    }
  }, [timeZone])

  const dismiss = useCallback(() => {
    const today = getTodayYMD()
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + today, '1')
    } catch {
      // ignore
    }
    setDismissedToday(true)
  }, [])

  const showBanner = completedToday === false && !dismissedToday
  return { showBanner, dismiss }
}
