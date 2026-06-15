/* useSmartQuickAdd: Shared smart title parsing, highlights, and dismiss-on-edit behavior for add mode */
import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { TaskPriority } from '../types'
import {
  findMatchAffectedByBackspace,
  findMatchAffectedByDelete,
  getDismissedSpanText,
  parseSmartQuickAdd,
  reapplySmartFieldForKind,
  type SmartQuickAddMatch,
  type SmartQuickAddMatchKind,
  type SmartQuickAddResult,
} from '../utils/smartQuickAdd'

interface UseSmartQuickAddOptions {
  /** When true, smart parsing is disabled (edit mode). */
  isEditMode: boolean
  /** Apply parsed smart fields to the parent form state. */
  applyParsedFields: (parsed: SmartQuickAddResult) => void
  /** Field setters used to clear smart-derived values after a dismiss. */
  fieldSetters: {
    setPriority: (value: TaskPriority) => void
    setDueDate: (value: string | null) => void
    setTimeEstimate: (value: number | null) => void
    setRecurrencePattern: (value: string | null) => void
  }
}

/**
 * Hook for Todoist-style smart quick add while typing a new task/subtask title.
 * Backspace/Delete on a highlighted token dismisses it without deleting title text.
 */
export function useSmartQuickAdd({ isEditMode, applyParsedFields, fieldSetters }: UseSmartQuickAddOptions) {
  const [smartTagNames, setSmartTagNames] = useState<string[]>([])
  const [smartMatches, setSmartMatches] = useState<SmartQuickAddMatch[]>([])
  const [dismissedSpans, setDismissedSpans] = useState<string[]>([])
  const smartParseTimerRef = useRef<number | null>(null)

  /* Parse helper: run parser with current dismissed spans and sync highlight state. */
  const runSmartParse = useCallback(
    (nextValue: string, spans = dismissedSpans): SmartQuickAddResult => {
      const parsed = parseSmartQuickAdd(nextValue, { now: new Date(), dismissedSpans: spans })
      setSmartTagNames(parsed.tagNames)
      setSmartMatches(parsed.matches)
      return parsed
    },
    [dismissedSpans],
  )

  /* Debounced parse while typing: update highlights and apply recognized fields. */
  const scheduleSmartParse = useCallback(
    (nextValue: string) => {
      if (isEditMode) return
      if (smartParseTimerRef.current) {
        window.clearTimeout(smartParseTimerRef.current)
      }
      smartParseTimerRef.current = window.setTimeout(() => {
        const parsed = runSmartParse(nextValue)
        applyParsedFields(parsed)
      }, 200)
    },
    [applyParsedFields, isEditMode, runSmartParse],
  )

  /* Dismiss-on-backspace: remove highlight and stop parsing that span; keep title text unchanged. */
  const handleSmartTitleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, title: string) => {
      if (isEditMode) return
      if (e.key !== 'Backspace' && e.key !== 'Delete') return

      const el = e.currentTarget
      const selectionStart = el.selectionStart ?? 0
      const selectionEnd = el.selectionEnd ?? 0
      const affectedMatch =
        e.key === 'Backspace'
          ? findMatchAffectedByBackspace(smartMatches, selectionStart, selectionEnd)
          : findMatchAffectedByDelete(smartMatches, selectionStart, selectionEnd)
      if (!affectedMatch) return

      const spanText = getDismissedSpanText(title, affectedMatch)
      if (!spanText) return

      /* Swallow the key so highlighted text stays in the title; only smart recognition is cleared. */
      e.preventDefault()

      const nextDismissed = dismissedSpans.includes(spanText)
        ? dismissedSpans
        : [...dismissedSpans, spanText]
      setDismissedSpans(nextDismissed)

      if (smartParseTimerRef.current) {
        window.clearTimeout(smartParseTimerRef.current)
        smartParseTimerRef.current = null
      }

      const parsed = runSmartParse(title, nextDismissed)
      reapplySmartFieldForKind(affectedMatch.kind as SmartQuickAddMatchKind, parsed, fieldSetters)
    },
    [dismissedSpans, fieldSetters, isEditMode, runSmartParse, smartMatches],
  )

  /* Parse on submit using the same dismissed spans as live typing. */
  const parseForSubmit = useCallback(
    (title: string) => parseSmartQuickAdd(title, { now: new Date(), dismissedSpans }),
    [dismissedSpans],
  )

  /* Reset smart quick add state when opening add mode. */
  const resetSmartQuickAdd = useCallback(() => {
    if (smartParseTimerRef.current) {
      window.clearTimeout(smartParseTimerRef.current)
      smartParseTimerRef.current = null
    }
    setSmartTagNames([])
    setSmartMatches([])
    setDismissedSpans([])
  }, [])

  /* Cleanup: cancel pending debounced parse on unmount. */
  const cancelPendingParse = useCallback(() => {
    if (smartParseTimerRef.current) {
      window.clearTimeout(smartParseTimerRef.current)
      smartParseTimerRef.current = null
    }
  }, [])

  return {
    smartTagNames,
    smartMatches,
    scheduleSmartParse,
    handleSmartTitleKeyDown,
    parseForSubmit,
    resetSmartQuickAdd,
    cancelPendingParse,
  }
}
