/* UserTimeZoneProvider: supplies effective IANA zone from auth metadata to the React tree */
import { useEffect, useMemo, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getEffectiveTimeZoneFromMetadata } from '../../lib/timezone'
import { UserTimeZoneContext } from './userTimeZoneContext'
import { syncAccountTimeZoneMetadata } from '../../lib/supabase/account'

interface UserTimeZoneProviderProps {
  /** Tree that should read the same resolved timezone */
  children: ReactNode
}

/**
 * Supplies `getEffectiveTimeZoneFromMetadata(user?.user_metadata)` to descendants.
 * Must render inside AuthProvider.
 */
export function UserTimeZoneProvider({ children }: UserTimeZoneProviderProps) {
  /* Auth: metadata drives optional override; hook recomputes when user changes */
  const { user } = useAuth()
  const timeZone = useMemo(
    () => getEffectiveTimeZoneFromMetadata(user?.user_metadata as Record<string, unknown> | undefined),
    [user?.user_metadata],
  )

  /* Timezone sync: persist the browser/device zone so server-side notifications match local behavior. */
  useEffect(() => {
    if (!user) return
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!browserTimeZone) return

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const savedTimeZone = typeof metadata.time_zone === 'string' ? metadata.time_zone.trim() : ''
    if (savedTimeZone === browserTimeZone) return

    void syncAccountTimeZoneMetadata(browserTimeZone).catch((error) => {
      console.error('Failed to sync browser timezone to account metadata:', error)
    })
  }, [user])

  return <UserTimeZoneContext.Provider value={timeZone}>{children}</UserTimeZoneContext.Provider>
}
