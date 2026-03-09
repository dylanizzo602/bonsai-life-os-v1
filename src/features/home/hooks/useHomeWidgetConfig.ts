/* useHomeWidgetConfig: Persist home widget order and visibility in localStorage */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY_ORDER = 'bonsai_home_widget_order'
const STORAGE_KEY_HIDDEN = 'bonsai_home_widget_hidden'

export const DEFAULT_WIDGET_ORDER = [
  'lineup',
  'inbox',
  'habits',
  'reflections',
  'upcoming',
  'goals',
  'misc',
] as const

export type HomeWidgetId = (typeof DEFAULT_WIDGET_ORDER)[number]

function loadOrder(): HomeWidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDER)
    if (!raw) return [...DEFAULT_WIDGET_ORDER]
    const parsed = JSON.parse(raw) as string[]
    const valid = DEFAULT_WIDGET_ORDER as unknown as string[]
    return parsed.filter((id) => valid.includes(id)) as HomeWidgetId[]
  } catch {
    return [...DEFAULT_WIDGET_ORDER]
  }
}

function loadHidden(): Set<HomeWidgetId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HIDDEN)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed as HomeWidgetId[])
  } catch {
    return new Set()
  }
}

/**
 * Hook to read and persist home widget order and visibility.
 * Order and hidden set are stored in localStorage so they survive refresh.
 */
export function useHomeWidgetConfig() {
  const [order, setOrderState] = useState<HomeWidgetId[]>(() => loadOrder())
  const [hidden, setHiddenState] = useState<Set<HomeWidgetId>>(() => loadHidden())

  /* Sync from localStorage on mount (in case another tab changed it) */
  useEffect(() => {
    setOrderState(loadOrder())
    setHiddenState(loadHidden())
  }, [])

  const persistOrder = useCallback((next: HomeWidgetId[]) => {
    setOrderState(next)
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(next))
  }, [])

  const persistHidden = useCallback((next: Set<HomeWidgetId>) => {
    setHiddenState(next)
    localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify([...next]))
  }, [])

  const setOrder = useCallback(
    (next: HomeWidgetId[] | ((prev: HomeWidgetId[]) => HomeWidgetId[])) => {
      persistOrder(typeof next === 'function' ? next(order) : next)
    },
    [order, persistOrder],
  )

  const toggleHidden = useCallback(
    (id: HomeWidgetId) => {
      const next = new Set(hidden)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistHidden(next)
    },
    [hidden, persistHidden],
  )

  const moveUp = useCallback(
    (id: HomeWidgetId) => {
      const i = order.indexOf(id)
      if (i <= 0) return
      const next = [...order]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      persistOrder(next)
    },
    [order, persistOrder],
  )

  const moveDown = useCallback(
    (id: HomeWidgetId) => {
      const i = order.indexOf(id)
      if (i < 0 || i >= order.length - 1) return
      const next = [...order]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      persistOrder(next)
    },
    [order, persistOrder],
  )

  return { order, hidden, setOrder, toggleHidden, moveUp, moveDown }
}
