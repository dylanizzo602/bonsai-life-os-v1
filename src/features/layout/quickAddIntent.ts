/* quickAddIntent: Cross-page quick-add triggers from mobile nav */

export type QuickAddIntent = 'task' | 'note' | 'inbox'

const STORAGE_KEY = 'bonsai_quick_add_intent'

/** Store intent before navigating; target page consumes on mount */
export function setQuickAddIntent(intent: QuickAddIntent): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, intent)
}

/** Read and clear intent (one-shot) */
export function consumeQuickAddIntent(): QuickAddIntent | null {
  if (typeof window === 'undefined') return null
  const value = sessionStorage.getItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (value === 'task' || value === 'note' || value === 'inbox') return value
  return null
}
