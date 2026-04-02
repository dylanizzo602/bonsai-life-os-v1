/* UserTimeZoneProvider: supplies effective IANA zone from auth metadata to the React tree */
import { useMemo, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getEffectiveTimeZoneFromMetadata } from '../../lib/timezone'
import { UserTimeZoneContext } from './userTimeZoneContext'

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
  return <UserTimeZoneContext.Provider value={timeZone}>{children}</UserTimeZoneContext.Provider>
}
