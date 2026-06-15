/* TimeEstimateModal: Compact popover for setting task time estimate with flexible input (minutes/hours) and subtask rollup */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { getSubtasks } from '../../../lib/supabase/tasks'
import type { Task } from '../types'

export interface TimeEstimateModalProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Function to call when popover should close */
  onClose: () => void
  /** Current time estimate in minutes */
  minutes: number | null
  /** Function to call when time estimate is saved (may return a Promise so the modal can await persistence) */
  onSave: (minutes: number | null) => void | Promise<void>
  /** Optional task ID to fetch subtasks and calculate total */
  taskId?: string | null
  /** Optional parent task minutes to include in rollup when viewing a task */
  parentTaskMinutes?: number | null
  /** Reference to the trigger element (time estimate button) for positioning */
  triggerRef?: React.RefObject<HTMLElement | null>
}

/**
 * Parse flexible time input string to minutes.
 * Recognizes formats like: "5m", "1h", "1h 30m", "90m", "1.5h", "2h 15m", etc.
 */
function parseTimeInput(input: string): number | null {
  if (!input || input.trim() === '') return null

  const trimmed = input.trim().toLowerCase()
  let totalMinutes = 0

  /* Match hours: "1h", "1hr", "1.5h", "2 hours", etc. */
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i)
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1])
    if (!isNaN(hours)) {
      totalMinutes += Math.round(hours * 60)
    }
  }

  /* Match minutes: "30m", "15min", "15 minutes", etc. */
  const minuteMatch = trimmed.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i)
  if (minuteMatch) {
    const parsedMinutes = parseInt(minuteMatch[1], 10)
    if (!isNaN(parsedMinutes)) {
      totalMinutes += parsedMinutes
    }
  }

  /* If no units found, try parsing as pure number (assume minutes) */
  if (totalMinutes === 0) {
    const pureNumber = parseFloat(trimmed.replace(/[^\d.]/g, ''))
    if (!isNaN(pureNumber) && trimmed.match(/^\d+(?:\.\d+)?$/)) {
      totalMinutes = Math.round(pureNumber)
    }
  }

  return totalMinutes > 0 ? totalMinutes : null
}

/**
 * Format minutes as a readable string (e.g., "5m", "1h 30m", "2h")
 */
function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === 0) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

const AUTO_SAVE_DEBOUNCE_MS = 500

export function TimeEstimateModal({
  isOpen,
  onClose,
  minutes,
  onSave,
  taskId,
  parentTaskMinutes,
  triggerRef,
}: TimeEstimateModalProps) {
  /* Popover ref: Reference to the popover element for positioning */
  const popoverRef = useRef<HTMLDivElement>(null)
  /* Position state: Store calculated popover position and arrow offset */
  const [position, setPosition] = useState({ top: 0, left: 0, arrowLeft: '50%' })
  /* Input state: Store user input as string */
  const [inputValue, setInputValue] = useState('')
  /* Subtasks state: Store fetched subtasks for rollup calculation */
  const [subtasks, setSubtasks] = useState<Task[]>([])
  /* Auto-save refs: Track last persisted value and debounce timer */
  const lastSavedRef = useRef<number | null | undefined>(undefined)
  const saveDebounceRef = useRef<number | null>(null)

  /* Initialize input value when popover opens or minutes change */
  useEffect(() => {
    if (isOpen) {
      setInputValue(minutes != null ? formatMinutes(minutes) : '')
      lastSavedRef.current = minutes
    }
  }, [isOpen, minutes])

  /* Fetch subtasks when popover opens and taskId is provided */
  useEffect(() => {
    if (!isOpen || !taskId) {
      setSubtasks([])
      return
    }

    const fetchSubtasksData = async () => {
      try {
        const data = await getSubtasks(taskId)
        setSubtasks(data)
      } catch (error) {
        console.error('Error fetching subtasks:', error)
        setSubtasks([])
      }
    }

    void fetchSubtasksData()
  }, [isOpen, taskId])

  /* Position: Anchor below trigger when available; otherwise center in viewport */
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const popoverWidth = popoverRect.width > 0 ? popoverRect.width : 360
      const popoverHeight = popoverRect.height > 0 ? popoverRect.height : 120

      if (triggerRef?.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        let top = triggerRect.bottom + 8
        let left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2

        if (left + popoverWidth > viewportWidth - padding) {
          left = viewportWidth - popoverWidth - padding
        }
        if (left < padding) left = padding
        if (top + popoverHeight > viewportHeight - padding) {
          top = triggerRect.top - popoverHeight - 8
        }
        if (top < padding) top = padding

        const triggerCenter = triggerRect.left + triggerRect.width / 2
        const arrowLeftPx = Math.max(16, Math.min(triggerCenter - left, popoverWidth - 16))

        setPosition({ top, left, arrowLeft: `${arrowLeftPx}px` })
        return
      }

      const top = Math.max(padding, (viewportHeight - popoverHeight) / 2)
      const left = Math.max(padding, (viewportWidth - popoverWidth) / 2)
      setPosition({ top, left, arrowLeft: '50%' })
    }

    const timeoutId = setTimeout(() => {
      calculatePosition()
      requestAnimationFrame(calculatePosition)
    }, 0)

    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, triggerRef])

  /* Persist estimate: Skip when unchanged; keep popover open on error */
  const persistEstimate = useCallback(
    async (parsedMinutes: number | null) => {
      if (parsedMinutes === lastSavedRef.current) return
      try {
        await onSave(parsedMinutes)
        lastSavedRef.current = parsedMinutes
      } catch (error) {
        console.error('Error saving time estimate:', error)
      }
    },
    [onSave],
  )

  /* Flush pending debounced save before closing */
  const flushAutoSave = useCallback(() => {
    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }
    void persistEstimate(parseTimeInput(inputValue))
  }, [inputValue, persistEstimate])

  /* Close handler: Flush auto-save then call parent onClose */
  const handleClose = useCallback(() => {
    flushAutoSave()
    onClose()
  }, [flushAutoSave, onClose])

  /* Close popover when clicking outside */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!triggerRef?.current || !triggerRef.current.contains(e.target as Node))
      ) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, handleClose, triggerRef])

  /* Close modal on ESC key press and prevent space/Enter from bubbling to parent */
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
      if ((e.key === ' ' || e.key === 'Enter') && popoverRef.current?.contains(e.target as Node)) {
        e.stopPropagation()
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, handleClose])

  /* Cleanup debounce timer on unmount */
  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) {
        window.clearTimeout(saveDebounceRef.current)
      }
    }
  }, [])

  /* Calculate subtask total: Sum all subtask time estimates */
  const subtaskTotalMinutes = subtasks.reduce((sum, subtask) => {
    return sum + (subtask.time_estimate ?? 0)
  }, 0)

  /* Calculate total with parent: Add parent task minutes when in task view */
  const totalWithParentMinutes =
    parentTaskMinutes != null && parentTaskMinutes > 0
      ? subtaskTotalMinutes + parentTaskMinutes
      : subtaskTotalMinutes

  /* Display total: Prefer rollup when subtasks exist; otherwise show parsed input */
  const parsedInputMinutes = parseTimeInput(inputValue)
  const displayTotalMinutes =
    subtasks.length > 0 || (parentTaskMinutes != null && parentTaskMinutes > 0)
      ? totalWithParentMinutes
      : parsedInputMinutes ?? minutes

  /* Handle input change: Debounced auto-save as user types */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value
    setInputValue(nextValue)
    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current)
    }
    saveDebounceRef.current = window.setTimeout(() => {
      void persistEstimate(parseTimeInput(nextValue))
    }, AUTO_SAVE_DEBOUNCE_MS)
  }

  /* Handle clear: Reset input and save null immediately */
  const handleClear = () => {
    setInputValue('')
    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }
    void persistEstimate(null)
  }

  /* Handle blur: Commit value when leaving the input */
  const handleInputBlur = () => {
    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }
    void persistEstimate(parseTimeInput(inputValue))
  }

  if (!isOpen) return null

  /* Portal above fullscreen task modal (same stacking as PriorityPickerModal) */
  const overlay = (
    <div className="fixed inset-0 z-[9999]" aria-hidden onClick={handleClose} />
  )

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] w-[360px] max-w-[calc(100vw-16px)] rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLButtonElement
          ) {
            return
          }
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      {/* Arrow: Points toward trigger when anchored; centered when modal is centered */}
      <div
        className="absolute -top-2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-outline-variant/20 bg-surface-container-lowest"
        style={{ left: position.arrowLeft }}
      />

      <div className="space-y-4 p-4">
        {/* Top row: Label with help icon and time input with clear */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-semibold tracking-tight text-on-surface">Time Estimate</span>
            <button
              type="button"
              className="flex items-center"
              aria-label="Time estimate help"
              title="Enter time in minutes (m) or hours (h). Examples: 5m, 1h, 1h 30m, 90m"
            >
              <MaterialIcon name="help" className="cursor-help text-[18px] text-outline" />
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="e.g. 5m"
              aria-label="Time estimate"
              className="w-32 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-1.5 pr-8 font-medium text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 text-on-surface transition-colors hover:text-error"
              aria-label="Clear time estimate"
            >
              <MaterialIcon name="close" className="text-[16px]" />
            </button>
          </div>
        </div>

        {/* Divider: Full-bleed separator */}
        <div className="-mx-4 h-px bg-outline-variant/20" />

        {/* Bottom row: Subtask rollup and auto-save hint */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Total with subtasks
            </span>
            <span className="text-sm font-semibold text-on-surface-variant">
              {formatMinutes(displayTotalMinutes) || '—'}
            </span>
          </div>
          <span className="text-[11px] italic text-outline">Changes are automatically saved</span>
        </div>
      </div>
    </div>
  )

  return createPortal(
    <>
      {overlay}
      {popover}
    </>,
    document.body,
  )
}
