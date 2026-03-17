/* useWeeklyBriefingBanner: Whether to show "finish your weekly briefing" banner on home (Sunday-only) */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getHasCompletedWeeklyBriefingThisWeek } from '../../../lib/supabase/reflections'
import { getTodayYMD } from '../../../lib/todaysLineup'

const DISMISS_KEY_PREFIX = 'bonsai-dismissed-weekly-briefing-'

/**
 * Returns whether to show the weekly briefing banner (Sunday-only), and a dismiss handler.
 * Banner shows when it's Sunday, user has not completed this week's weekly briefing, and has not dismissed for today.
 */
export function useWeeklyBriefingBanner() {
  const [completedThisWeek, setCompletedThisWeek] = useState<boolean | null>(null)
  const [dismissedToday, setDismissedToday] = useState(false)

  /* Date state: determine whether today is Sunday */
  const isSunday = useMemo(() => new Date().getDay() === 0, [])

  /* Check completed and dismissed on mount */
  useEffect(() => {
    if (!isSunday) {
      setCompletedThisWeek(true)
      setDismissedToday(false)
      return
    }

    let cancelled = false
    getHasCompletedWeeklyBriefingThisWeek().then((completed) => {
      if (!cancelled) setCompletedThisWeek(completed)
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
  }, [isSunday])

  /* Dismiss handler: store dismissal for today's date */
  const dismiss = useCallback(() => {
    const today = getTodayYMD()
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + today, '1')
    } catch {
      // ignore
    }
    setDismissedToday(true)
  }, [])

  const showBanner = isSunday && completedThisWeek === false && !dismissedToday
  return { showBanner, dismiss }
}

