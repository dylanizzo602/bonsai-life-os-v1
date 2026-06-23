/* useSearchPanel: Shared search state, keyboard nav, and navigation handlers */

import { useCallback, useEffect, useState } from 'react'
import type { NavigationSection } from '../../layout/hooks/useNavigation'
import { setQuickAddIntent } from '../../layout/quickAddIntent'
import { useGlobalSearch } from './useGlobalSearch'
import { setSearchOpenIntent } from '../searchOpenIntent'
import {
  SEARCH_QUICK_ACTIONS,
  searchResultToOpenIntent,
  type SearchQuickActionId,
  type SearchResult,
} from '../types'

function quickActionNavigateSection(id: SearchQuickActionId): NavigationSection {
  switch (id) {
    case 'task':
      return 'tasks'
    case 'inbox':
      return 'home'
    case 'note':
      return 'notes'
    case 'habit':
      return 'habits'
  }
}

interface UseSearchPanelOptions {
  isOpen: boolean
  onNavigate: (section: NavigationSection) => void
  onClose: () => void
}

/**
 * Orchestrates global search: query, results, keyboard highlight, and navigation.
 */
export function useSearchPanel({ isOpen, onNavigate, onClose }: UseSearchPanelOptions) {
  const [query, setQueryState] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const { results, loading, error } = useGlobalSearch(query, isOpen)

  const hasQuery = query.trim().length > 0
  const itemCount = hasQuery ? results.length : SEARCH_QUICK_ACTIONS.length

  /* Reset panel state when closing */
  const reset = useCallback(() => {
    setQueryState('')
    setHighlightedIndex(0)
  }, [])

  /* Update query and reset keyboard highlight */
  const setQuery = useCallback((value: string) => {
    setQueryState(value)
    setHighlightedIndex(0)
  }, [])

  const closePanel = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const handleQuickAction = useCallback(
    (id: SearchQuickActionId) => {
      if (id === 'task') setQuickAddIntent('task')
      else if (id === 'inbox') setQuickAddIntent('inbox')
      else if (id === 'note') setQuickAddIntent('note')

      onNavigate(quickActionNavigateSection(id))
      closePanel()
    },
    [onNavigate, closePanel],
  )

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      const intent = searchResultToOpenIntent(result)
      setSearchOpenIntent(intent)

      const section: NavigationSection =
        result.kind === 'task'
          ? 'tasks'
          : result.kind === 'habit'
            ? 'habits'
            : result.kind === 'goal' || result.kind === 'milestone'
              ? 'goals'
              : result.kind === 'reflection'
                ? 'reflections'
                : 'notes'

      onNavigate(section)
      closePanel()
    },
    [onNavigate, closePanel],
  )

  const activateHighlighted = useCallback(() => {
    if (itemCount === 0) return

    if (hasQuery) {
      const result = results[highlightedIndex]
      if (result) handleSelectResult(result)
    } else {
      const action = SEARCH_QUICK_ACTIONS[highlightedIndex]
      if (action) handleQuickAction(action.id)
    }
  }, [itemCount, hasQuery, results, highlightedIndex, handleSelectResult, handleQuickAction])

  const moveHighlight = useCallback(
    (delta: number) => {
      if (itemCount === 0) return
      setHighlightedIndex((prev) => {
        const next = prev + delta
        if (next < 0) return itemCount - 1
        if (next >= itemCount) return 0
        return next
      })
    },
    [itemCount],
  )

  /* Keyboard: arrows, Enter (Escape handled by parent components) */
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveHighlight(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveHighlight(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        activateHighlighted()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, moveHighlight, activateHighlighted])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    hasQuery,
    highlightedIndex,
    handleQuickAction,
    handleSelectResult,
    reset,
    closePanel,
  }
}
