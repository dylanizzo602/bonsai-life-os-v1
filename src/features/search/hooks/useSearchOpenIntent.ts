/* useSearchOpenIntent: Consume global search open intents on mount, data ready, or same-section event */

import { useCallback, useEffect, useMemo } from 'react'
import {
  clearSearchOpenIntent,
  peekSearchOpenIntent,
  subscribeSearchOpenIntent,
  type SearchOpenIntent,
} from '../searchOpenIntent'

type SearchOpenIntentKind = SearchOpenIntent['kind']

interface UseSearchOpenIntentOptions {
  /** Intent kind(s) this page handles */
  kinds: SearchOpenIntentKind | SearchOpenIntentKind[]
  /** When false, peek but do not consume (wait for data load) */
  ready?: boolean
  /**
   * Handle a matching intent. Return false to leave intent in storage (e.g. data not ready).
   * Any other return clears the intent after handling.
   */
  onMatch: (intent: SearchOpenIntent) => boolean | void | Promise<boolean | void>
  /** Extra dependencies for the match handler */
  deps?: unknown[]
}

/**
 * Listens for global search open intents: on mount, when ready/data changes,
 * and when search navigates within the same section (custom event).
 */
export function useSearchOpenIntent({
  kinds,
  ready = true,
  onMatch,
  deps = [],
}: UseSearchOpenIntentOptions): void {
  /* Normalize kinds to a set for fast lookup */
  const kindSet = useMemo(
    () => new Set(Array.isArray(kinds) ? kinds : [kinds]),
    [kinds],
  )

  /* Attempt to consume a matching intent from sessionStorage */
  const tryConsume = useCallback(async () => {
    if (!ready) return

    const intent = peekSearchOpenIntent()
    if (!intent || !kindSet.has(intent.kind)) return

    try {
      const result = await onMatch(intent)
      if (result !== false) {
        clearSearchOpenIntent()
      }
    } catch {
      /* Leave intent in storage when handler throws */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, [ready, kindSet, onMatch, ...deps])

  /* Run on mount and when tryConsume identity changes (data ready, etc.) */
  useEffect(() => {
    void tryConsume()
  }, [tryConsume])

  /* Re-run when search sets intent while already on this section */
  useEffect(() => {
    return subscribeSearchOpenIntent(() => {
      void tryConsume()
    })
  }, [tryConsume])
}
