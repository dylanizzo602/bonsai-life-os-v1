/* useDevMode: React hook for the local dev mode preference */

import { useCallback, useEffect, useState } from 'react'
import {
  DEV_MODE_CHANGE_EVENT,
  DEV_MODE_STORAGE_KEY,
  getDevModeEnabled,
  setDevModeEnabled,
} from '../devMode'

/**
 * Subscribe to dev mode changes (Settings toggle, other tabs via storage event).
 */
export function useDevMode() {
  const [devModeEnabled, setDevModeEnabledState] = useState(getDevModeEnabled)

  /* Sync when toggled in Settings or another tab */
  useEffect(() => {
    const syncFromStorage = () => setDevModeEnabledState(getDevModeEnabled())

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DEV_MODE_STORAGE_KEY) syncFromStorage()
    }

    window.addEventListener(DEV_MODE_CHANGE_EVENT, syncFromStorage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(DEV_MODE_CHANGE_EVENT, syncFromStorage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const updateDevModeEnabled = useCallback((enabled: boolean) => {
    setDevModeEnabled(enabled)
    setDevModeEnabledState(enabled)
  }, [])

  return { devModeEnabled, setDevModeEnabled: updateDevModeEnabled }
}
