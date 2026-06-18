/* Dev mode preference: localStorage flag for developer-only UI (e.g. briefing preview nav) */

export const DEV_MODE_STORAGE_KEY = 'bonsai_dev_mode'

/** Dispatched on the same tab when dev mode is toggled in Settings */
export const DEV_MODE_CHANGE_EVENT = 'bonsai-dev-mode-change'

/** Read whether dev mode is enabled (defaults to off) */
export function getDevModeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Persist dev mode and notify listeners in this tab */
export function setDevModeEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? '1' : '0')
    window.dispatchEvent(new CustomEvent(DEV_MODE_CHANGE_EVENT))
  } catch {
    /* Ignore localStorage errors */
  }
}
