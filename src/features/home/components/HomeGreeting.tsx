/* HomeGreeting: Time-based greeting with user's first name */

import { useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'

/** Pick morning / afternoon / evening label from local hour */
function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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

  const greeting = getTimeGreeting()
  const name = firstName ?? 'there'

  return (
    <div className="mb-10">
      <h1 className="text-page-title font-semibold tracking-tight text-on-surface">
        {greeting}, {name}
      </h1>
      <p className="mt-2 text-body font-light text-on-surface-variant">
        Let&apos;s find your focus for today.
      </p>
    </div>
  )
}
