/* Local notification scheduler: trigger browser notifications for task/habit/briefing time rules while the app is open */
import { useEffect, useMemo, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { useAuth } from '../../auth/AuthContext'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import { getTasks } from '../../../lib/supabase/tasks'
import { getHabits } from '../../../lib/supabase/habits'
import { getHasCompletedMorningBriefingToday } from '../../../lib/supabase/reflections'
import {
  buildEffectivePreferencesMap,
  getNotificationPreferences,
  isNotificationEnabled,
} from '../../../lib/supabase/notificationPreferences'
import type { EffectiveNotificationPreferences, NotificationType } from '../../../lib/notifications/types'
import { registerServiceWorker } from '../../../lib/notifications/pushClient'
import type { Task } from '../../tasks/types'
import type { Habit } from '../../habits/types'
import { getTodayYMD } from '../../../lib/todaysLineup'
import { resolveHabitRemindAt } from '../../habits/habitReminderEligibility'

/** Local scheduler polling cadence: frequent enough to catch 12pm and minute-level habit/timed due transitions */
const TICK_MS = 30 * 1000

/** Dedupe prefix: storage keys used to avoid repeatedly notifying for the same logical event */
const DEDUPE_PREFIX = 'bonsai-local-notify-'

/** Basic task status guard: only notify for active/in-progress work */
const NOTIFIABLE_TASK_STATUSES = new Set(['active', 'in_progress'])

/**
 * Determine whether a raw due string includes a meaningful clock time (not just midnight placeholders).
 * Matches the task date helper behavior where 00:00 is treated like date-only.
 */
function hasExplicitTimeInString(isoString: string): boolean {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
  return !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
}

/** Local storage: check whether we've already fired a notification for this logical event */
function wasNotified(dedupeKey: string): boolean {
  try {
    return localStorage.getItem(DEDUPE_PREFIX + dedupeKey) === '1'
  } catch {
    return false
  }
}

/** Local storage: persist that we've fired a notification for this logical event */
function markNotified(dedupeKey: string): void {
  try {
    localStorage.setItem(DEDUPE_PREFIX + dedupeKey, '1')
  } catch {
    // ignore
  }
}

/**
 * Show a local browser notification, preferring the service worker when available.
 * This works while the app is open; it does not attempt server-side push scheduling.
 */
async function showLocalNotification(params: { title: string; body: string; url: string }) {
  /* Capability guard: only proceed when Notifications exist and are already granted */
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  /* Service worker path: keeps notification behavior consistent with push click handling */
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(params.title, {
        body: params.body,
        icon: '/icons/icon.svg',
        data: { url: params.url },
      })
      return
    }
  } catch {
    // fall back to direct Notification below
  }

  /* Direct notification fallback: works in most browsers with granted permission */
  try {
    // eslint-disable-next-line no-new
    new Notification(params.title, { body: params.body, icon: '/icons/icon.svg' })
  } catch {
    // ignore
  }
}

/**
 * Local notification scheduler hook.
 * Triggers:
 * - Timed task due in 1 hour.
 * - Date-only task becomes overdue.
 * - Habit reminder hits its reminder time.
 * - Morning briefing still incomplete at 12pm local time.
 */
export function useLocalNotificationScheduler() {
  /* Auth: only run when signed in so queries resolve and preferences are user-scoped */
  const { session } = useAuth()
  /* Time zone: consistent with Settings and task due semantics */
  const timeZone = useUserTimeZone()

  /* Preferences: cache the effective preference map for quick checks during ticking */
  const [prefsMap, setPrefsMap] = useState<EffectiveNotificationPreferences>({})
  const prefsLoadedRef = useRef(false)

  /* Memo: a stable “push mobile” channel key for preference gating */
  const channel = useMemo(() => 'push_mobile' as const, [])

  /* Initial effect: ensure service worker is registered so showNotification works */
  useEffect(() => {
    if (!session) return
    void registerServiceWorker()
  }, [session])

  /* Preferences load: fetch once on login and refresh on demand if needed */
  useEffect(() => {
    if (!session) return
    let cancelled = false

    const load = async () => {
      try {
        const rows = await getNotificationPreferences()
        if (cancelled) return
        setPrefsMap(buildEffectivePreferencesMap(rows))
        prefsLoadedRef.current = true
      } catch {
        if (cancelled) return
        setPrefsMap({})
        prefsLoadedRef.current = true
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [session])

  /* Core scheduler: poll and evaluate rules; visibilitychange triggers a quick catch-up tick */
  useEffect(() => {
    if (!session) return
    if (!prefsLoadedRef.current) return

    let cancelled = false

    const isEnabled = (type: NotificationType): boolean => isNotificationEnabled(prefsMap, type, channel)

    const tick = async () => {
      if (cancelled) return

      const nowMs = Date.now()
      const todayYMD = getTodayYMD()

      /* Data fetch: pull notifiable tasks (include subtasks) and habits for reminder-time logic */
      const [tasks, habits, completedMorningBriefing] = await Promise.all([
        getTasks({ includeAllTasks: true, timeZone }).catch(() => [] as Task[]),
        getHabits().catch(() => [] as Habit[]),
        getHasCompletedMorningBriefingToday().catch(() => false),
      ])

      if (cancelled) return

      /* Rule: timed tasks due in 1 hour (non-habit tasks only) */
      if (isEnabled('task_due_soon')) {
        for (const t of tasks) {
          if (!t.due_date) continue
          if (t.habit_id) continue
          if (!NOTIFIABLE_TASK_STATUSES.has(t.status)) continue
          if (!t.due_date.includes('T') || !hasExplicitTimeInString(t.due_date)) continue

          const dueMs = new Date(t.due_date).getTime()
          if (!Number.isFinite(dueMs)) continue

          const untilDue = dueMs - nowMs
          if (untilDue <= 60 * 60 * 1000 && untilDue > 0) {
            const dedupeKey = `task_due_soon:${t.id}`
            if (wasNotified(dedupeKey)) continue
            markNotified(dedupeKey)
            await showLocalNotification({
              title: 'Task due soon',
              body: `${t.title || 'Untitled task'} is due in 1 hour.`,
              url: '/?section=tasks',
            })
          }
        }
      }

      /* Rule: date-only tasks become overdue (notify at start of the next day in the user’s zone) */
      if (isEnabled('task_overdue')) {
        const nowZ = DateTime.now().setZone(timeZone)
        const todayKey = nowZ.startOf('day').toFormat('yyyy-LL-dd')

        for (const t of tasks) {
          if (!t.due_date) continue
          if (t.habit_id) continue
          if (!NOTIFIABLE_TASK_STATUSES.has(t.status)) continue

          const isDateOnly = !t.due_date.includes('T') || !hasExplicitTimeInString(t.due_date)
          if (!isDateOnly) continue

          const dueDay = t.due_date.slice(0, 10)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDay)) continue

          if (dueDay < todayKey) {
            const dedupeKey = `task_overdue_date_only:${t.id}:${todayKey}`
            if (wasNotified(dedupeKey)) continue
            markNotified(dedupeKey)
            await showLocalNotification({
              title: 'Task overdue',
              body: `${t.title || 'Untitled task'} is now overdue.`,
              url: '/?section=tasks',
            })
          }
        }
      }

      /* Rule: habit reminder hits its reminder time (today only, per-habit) */
      if (isEnabled('habit_reminder_due')) {
        for (const h of habits) {
          const remindAtIso = resolveHabitRemindAt(h, todayYMD)
          if (!remindAtIso) continue

          const dueMs = new Date(remindAtIso).getTime()
          if (!Number.isFinite(dueMs)) continue

          if (nowMs >= dueMs && nowMs - dueMs <= 5 * 60 * 1000) {
            const dedupeKey = `habit_reminder_due:${h.id}:${todayYMD}`
            if (wasNotified(dedupeKey)) continue
            markNotified(dedupeKey)
            await showLocalNotification({
              title: 'Habit reminder',
              body: `${h.name || 'Habit'} is due now.`,
              url: '/?section=tasks',
            })
          }
        }
      }

      /* Rule: morning briefing incomplete by 12pm local time (once per day) */
      if (isEnabled('morning_briefing_incomplete_noon')) {
        if (!completedMorningBriefing) {
          const nowZ = DateTime.now().setZone(timeZone)
          const noon = nowZ.set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
          if (nowZ.toMillis() >= noon.toMillis()) {
            const dedupeKey = `morning_briefing_incomplete_noon:${todayYMD}`
            if (!wasNotified(dedupeKey)) {
              markNotified(dedupeKey)
              await showLocalNotification({
                title: 'Morning briefing',
                body: 'Your morning briefing is still incomplete.',
                url: '/?section=briefings',
              })
            }
          }
        }
      }
    }

    const id = window.setInterval(() => void tick(), TICK_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    /* Kick off immediately on mount */
    void tick()

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [session, prefsMap, timeZone, channel])
}

