/* React context: holds the resolved IANA time zone string for the signed-in user */
import { createContext } from 'react'

/** Context value is the active IANA zone, or undefined when no provider is mounted */
export const UserTimeZoneContext = createContext<string | undefined>(undefined)
