/* searchOpenIntent: Cross-page open-item triggers from global search results */

export type SearchOpenIntent =
  | { kind: 'task'; id: string }
  | { kind: 'habit'; id: string }
  | { kind: 'goal'; id: string }
  | { kind: 'milestone'; goalId: string; milestoneId: string }
  | { kind: 'reflection'; id: string }
  | { kind: 'note'; id: string; pageId?: string }
  | { kind: 'note_folder'; id: string }

const STORAGE_KEY = 'bonsai_search_open_intent'

/** Custom event fired when a new search open intent is stored (same-section navigation) */
export const SEARCH_OPEN_INTENT_EVENT = 'bonsai:search-open-intent'

/** Store intent before navigating; target page consumes on mount or via event */
export function setSearchOpenIntent(intent: SearchOpenIntent): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent))
  window.dispatchEvent(new CustomEvent(SEARCH_OPEN_INTENT_EVENT))
}

/** Parse stored intent JSON */
function parseSearchOpenIntent(raw: string | null): SearchOpenIntent | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as SearchOpenIntent
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) return null

    switch (parsed.kind) {
      case 'task':
      case 'habit':
      case 'goal':
      case 'reflection':
      case 'note_folder':
        return typeof parsed.id === 'string' ? parsed : null
      case 'milestone':
        return typeof parsed.goalId === 'string' && typeof parsed.milestoneId === 'string'
          ? parsed
          : null
      case 'note':
        return typeof parsed.id === 'string'
          ? { kind: 'note', id: parsed.id, pageId: parsed.pageId }
          : null
      default:
        return null
    }
  } catch {
    return null
  }
}

/** Read intent without clearing (for pages waiting on data load) */
export function peekSearchOpenIntent(): SearchOpenIntent | null {
  if (typeof window === 'undefined') return null
  return parseSearchOpenIntent(sessionStorage.getItem(STORAGE_KEY))
}

/** Clear a stored open intent after it has been handled */
export function clearSearchOpenIntent(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

/** Read and clear intent (one-shot) */
export function consumeSearchOpenIntent(): SearchOpenIntent | null {
  if (typeof window === 'undefined') return null
  const intent = peekSearchOpenIntent()
  clearSearchOpenIntent()
  return intent
}

/** Subscribe to search open intent updates; returns unsubscribe */
export function subscribeSearchOpenIntent(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(SEARCH_OPEN_INTENT_EVENT, listener)
  return () => window.removeEventListener(SEARCH_OPEN_INTENT_EVENT, listener)
}
