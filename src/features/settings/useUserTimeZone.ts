/* useUserTimeZone: read the active IANA zone from UserTimeZoneProvider with a safe fallback */
import { useContext } from 'react'
import { getEffectiveTimeZoneFromMetadata } from '../../lib/timezone'
import { UserTimeZoneContext } from './userTimeZoneContext'

/**
 * Returns the active IANA timezone string for due dates, labels, and comparisons.
 */
export function useUserTimeZone(): string {
  const ctx = useContext(UserTimeZoneContext)
  if (ctx !== undefined) return ctx
  /* Safe fallback when used outside provider (e.g. tests or storybook) */
  return getEffectiveTimeZoneFromMetadata(undefined)
}
