/* HomeGreeting: Time-based greeting with user's first name and contextual subtitle */

import { useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'

type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night'

/** Copy for each part of the day */
const PERIOD_COPY: Record<DayPeriod, { greeting: string; subtitle: string }> = {
  morning: {
    greeting: 'Good morning',
    subtitle: "Let's find your focus for today.",
  },
  afternoon: {
    greeting: 'Good afternoon',
    subtitle: 'Keep it up.',
  },
  evening: {
    greeting: 'Good evening',
    subtitle: 'Wrap it up.',
  },
  night: {
    greeting: 'Good night',
    subtitle: 'Get some rest.',
  },
}

/** Map local hour to morning / afternoon / evening / night */
function getDayPeriod(hour: number): DayPeriod {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/** Greeting line and subtitle for the current local time */
function getHomeGreetingContent(): { greeting: string; subtitle: string } {
  const hour = new Date().getHours()
  return PERIOD_COPY[getDayPeriod(hour)]
}

/**
 * Dashboard hero greeting using profile first name from user metadata.
 */
export function HomeGreeting() {
  const { user } = useAuth()

  /* Display name: first_name from Supabase user metadata (same as Settings) */
  const firstName = useMemo(() => {
    const raw = user?.user_metadata?.first_name
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null
  }, [user])

  const { greeting, subtitle } = getHomeGreetingContent()
  const name = firstName ?? 'there'

  return (
    <div className="mb-10">
      <h1 className="text-page-title font-semibold tracking-tight text-on-surface">
        {greeting}, {name}
      </h1>
      <p className="text-body font-light text-on-surface-variant">{subtitle}</p>
    </div>
  )
}
