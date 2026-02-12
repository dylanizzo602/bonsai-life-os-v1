/* TimeEstimateModal: Compact popover for setting task time estimate with flexible input (minutes/hours) and subtask rollup */

import { useState, useEffect, useRef } from 'react'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { getSubtasks } from '../../../lib/supabase/tasks'
import type { Task } from '../types'

export interface TimeEstimateModalProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Function to call when popover should close */
  onClose: () => void
  /** Current time estimate in minutes */
  minutes: number | null
  /** Function to call when time estimate is saved (can be async) */
  onSave: (minutes: number | null) => void
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

  /* Match hours: "1h", "1.5h", "2h", etc. */
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i)
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1])
    if (!isNaN(hours)) {
      totalMinutes += Math.round(hours * 60)
    }
  }

  /* Match minutes: "30m", "15m", etc. (but not if already matched as part of hours) */
  const minuteMatch = trimmed.match(/(\d+)\s*m(?:in(?:utes?)?)?/i)
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10)
    if (!isNaN(minutes)) {
      totalMinutes += minutes
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
  /* Position state: Store calculated popover position */
  const [position, setPosition] = useState({ top: 0, left: 0 })
  /* Input state: Store user input as string */
  const [inputValue, setInputValue] = useState('')
  /* Subtasks state: Store fetched subtasks for rollup calculation */
  const [subtasks, setSubtasks] = useState<Task[]>([])

  /* Initialize input value when popover opens or minutes change */
  useEffect(() => {
    if (isOpen) {
      setInputValue(minutes != null ? formatMinutes(minutes) : '')
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

    fetchSubtasksData()
  }, [isOpen, taskId])

  /* Position calculation: Calculate popover position relative to trigger element with viewport boundary detection */
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current) return
      
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8 // Minimum padding from viewport edges
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      /* Use actual rendered width/height, or fallback if not yet rendered */
      const popoverWidth = popoverRect.width > 0 ? popoverRect.width : 384
      const popoverHeight = popoverRect.height > 0 ? popoverRect.height : 200

      if (triggerRef?.current) {
        /* Popover positioning: Position below trigger when triggerRef is provided */
        const triggerRect = triggerRef.current.getBoundingClientRect()
        
        /* Initial position: Below the trigger, aligned to its left edge */
        let top = triggerRect.bottom + 4 // 4px gap below trigger
        let left = triggerRect.left // Align with left edge of trigger
        
        /* Horizontal boundary: Ensure popover stays within viewport */
        /* Check if popover would overflow right edge */
        if (left + popoverWidth > viewportWidth - padding) {
          /* Shift left to keep popover within viewport */
          left = Math.max(padding, viewportWidth - popoverWidth - padding)
        }
        
        /* Ensure popover doesn't go off left edge */
        if (left < padding) {
          left = padding
        }
        
        /* Final check: Ensure right edge doesn't exceed viewport */
        const rightEdge = left + popoverWidth
        if (rightEdge > viewportWidth - padding) {
          left = Math.max(padding, viewportWidth - popoverWidth - padding)
        }
        
        /* Vertical boundary: Adjust top if popover would overflow bottom edge */
        if (top + popoverHeight > viewportHeight - padding) {
          /* Position above trigger instead of below */
          top = Math.max(padding, triggerRect.top - popoverHeight - 4)
        }
        
        /* Ensure popover doesn't go off top edge */
        if (top < padding) {
          top = padding
        }
        
        setPosition({ top, left })
      } else {
        /* Centered positioning: Center in viewport when no triggerRef */
        const top = Math.max(padding, (viewportHeight - popoverHeight) / 2)
        const left = Math.max(padding, Math.min((viewportWidth - popoverWidth) / 2, viewportWidth - popoverWidth - padding))
        setPosition({ top, left })
      }
    }

    /* Calculate position after a brief delay to ensure DOM is ready, then recalculate once rendered */
    const timeoutId = setTimeout(() => {
      calculatePosition()
      /* Recalculate after a short delay to ensure dimensions are correct */
      requestAnimationFrame(() => {
        calculatePosition()
      })
    }, 0)
    
    /* Recalculate on scroll/resize */
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, triggerRef])

  /* Close popover when clicking outside */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!triggerRef || (triggerRef.current && !triggerRef.current.contains(e.target as Node)))
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  /* Close modal on ESC key press and prevent space/Enter from bubbling to parent */
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      /* Prevent space and Enter from bubbling to parent (e.g., FullTaskItem onClick) */
      if ((e.key === ' ' || e.key === 'Enter') && popoverRef.current?.contains(e.target as Node)) {
        e.stopPropagation()
        /* Allow space to work normally in input fields */
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        /* Prevent default for space/Enter on other elements */
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true) // Use capture phase to catch early
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  /* Calculate subtask total: Sum all subtask time estimates */
  const subtaskTotalMinutes = subtasks.reduce((sum, subtask) => {
    return sum + (subtask.time_estimate ?? 0)
  }, 0)

  /* Calculate total with parent: Add parent task minutes when in task view */
  const totalWithParentMinutes =
    parentTaskMinutes != null && parentTaskMinutes > 0
      ? subtaskTotalMinutes + parentTaskMinutes
      : subtaskTotalMinutes

  /* Handle input change: Update input value as user types */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  /* Handle save: Parse input and save, then close popover */
  const handleSave = async () => {
    const parsedMinutes = parseTimeInput(inputValue)
    try {
      await onSave(parsedMinutes)
      /* Close popover only after save completes successfully */
      onClose()
    } catch (error) {
      /* Keep popover open on error so user can try again */
      console.error('Error saving time estimate:', error)
    }
  }

  /* Handle clear: Clear input */
  const handleClear = () => {
    setInputValue('')
  }

  if (!isOpen) return null

  /* Render popover with centered modal design: Positioned below trigger or centered */
  return (
    <>
      {/* Backdrop: Only show when no triggerRef (centered modal) */}
      {!triggerRef && (
        <div 
          className="fixed inset-0 z-50 bg-bonsai-slate-900/30"
          onClick={onClose}
        />
      )}
      <div
        ref={popoverRef}
        className="fixed z-50 bg-white rounded-lg border border-bonsai-slate-200 shadow-lg p-4 w-full max-w-sm"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxWidth: `min(384px, calc(100vw - 16px))`,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          /* Prevent space and Enter from bubbling to parent (e.g., FullTaskItem onClick) */
          if (e.key === ' ' || e.key === 'Enter') {
            /* Allow space/Enter to work normally in input fields */
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) {
              return
            }
            /* Stop propagation for other elements */
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <div className="space-y-4">
          {/* Header: Title with help button */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-bonsai-slate-700">Time Estimate</h3>
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-bonsai-slate-200 text-bonsai-slate-500 hover:bg-bonsai-slate-300 hover:text-bonsai-slate-700 flex items-center justify-center text-xs font-medium transition-colors"
              aria-label="Help"
              title="Enter time in minutes (m) or hours (h). Examples: 5m, 1h, 1h 30m, 90m"
            >
              ?
            </button>
          </div>

          {/* Time estimate input: Simple box with flexible parsing */}
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="e.g. 5m, 1h, 1h 30m"
              value={inputValue}
              onChange={handleInputChange}
              className="flex-1"
              aria-label="Time estimate"
              size="sm"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="text-bonsai-slate-500 hover:text-bonsai-slate-700 transition-colors"
                aria-label="Clear time estimate"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Subtask rollup and Save button: Inline layout */}
          {(subtasks.length > 0 || (parentTaskMinutes != null && parentTaskMinutes > 0)) ? (
            <div className="border-t border-bonsai-slate-200 pt-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-bonsai-slate-500 uppercase tracking-wide mb-1">
                    Total with subtasks
                  </p>
                  <p className="text-sm font-semibold text-bonsai-slate-700">
                    {formatMinutes(totalWithParentMinutes)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
