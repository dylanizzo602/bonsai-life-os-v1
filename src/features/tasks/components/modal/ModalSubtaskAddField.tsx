/* ModalSubtaskAddField: Add new subtask or link an existing task from one modal-styled row */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { TaskOption } from '../../../../components/TaskSearchSelect'

export interface ModalSubtaskAddFieldProps {
  /** Parent task id (excluded from link search) */
  taskId: string
  /** Fetch linkable tasks (top-level tasks only) */
  getTasksForLinking: () => Promise<TaskOption[]>
  /** Create a new subtask with the given title */
  onCreateSubtask: (title: string) => Promise<void>
  /** Link an existing task as a subtask */
  onLinkExistingTask: (task: TaskOption) => Promise<void>
  /** Additional task ids to exclude from link results */
  excludeTaskIds?: string[]
  disabled?: boolean
}

/**
 * Combined subtask add + link control for the task edit modal.
 * Type to search existing tasks; Enter or Add creates a new subtask when no match is selected.
 */
export function ModalSubtaskAddField({
  taskId,
  getTasksForLinking,
  onCreateSubtask,
  onLinkExistingTask,
  excludeTaskIds = [],
  disabled = false,
}: ModalSubtaskAddFieldProps) {
  const [query, setQuery] = useState('')
  const [allTasks, setAllTasks] = useState<TaskOption[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [submitting, setSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFieldClassName =
    'flex-1 bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none'
  const addButtonClassName =
    'px-6 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0'

  const excluded = useMemo(
    () => new Set([taskId, ...excludeTaskIds]),
    [taskId, excludeTaskIds],
  )

  /* Load linkable tasks on first focus */
  const ensureTasksLoaded = useCallback(async () => {
    if (loading || allTasks.length > 0) return
    setLoading(true)
    try {
      const tasks = await getTasksForLinking()
      setAllTasks(tasks)
    } catch (err) {
      console.error('Error fetching tasks for subtask link:', err)
    } finally {
      setLoading(false)
    }
  }, [allTasks.length, getTasksForLinking, loading])

  /* Filter tasks for the link dropdown */
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allTasks
      .filter((t) => !excluded.has(t.id))
      .filter((t) => t.title.toLowerCase().includes(q))
      .sort((a, b) => {
        const aIdx = a.title.toLowerCase().indexOf(q)
        const bIdx = b.title.toLowerCase().indexOf(q)
        if (aIdx === bIdx) return a.title.localeCompare(b.title)
        return aIdx - bIdx
      })
      .slice(0, 3)
  }, [allTasks, excluded, query])

  const handleSelectLink = useCallback(
    async (task: TaskOption) => {
      setSubmitting(true)
      try {
        await onLinkExistingTask(task)
        setQuery('')
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
      } catch (err) {
        console.error('Error linking task as subtask:', err)
      } finally {
        setSubmitting(false)
      }
    },
    [onLinkExistingTask],
  )

  const handleCreate = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onCreateSubtask(trimmed)
      setQuery('')
      setIsOpen(false)
      setHighlightedIndex(-1)
    } catch (err) {
      console.error('Error creating subtask:', err)
    } finally {
      setSubmitting(false)
    }
  }, [onCreateSubtask, query, submitting])

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className={addFieldClassName}
          placeholder="Add or link a subtask"
          type="text"
          value={query}
          disabled={disabled || submitting}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          aria-label="Add or link a subtask"
          onChange={(e) => {
            const value = e.target.value
            setQuery(value)
            setIsOpen(value.trim().length > 0)
            setHighlightedIndex(-1)
          }}
          onFocus={() => {
            void ensureTasksLoaded()
            if (query.trim()) setIsOpen(true)
          }}
          onKeyDown={(e) => {
            if (disabled || submitting) return
            switch (e.key) {
              case 'ArrowDown':
                if (filteredTasks.length === 0) return
                e.preventDefault()
                setIsOpen(true)
                setHighlightedIndex((prev) =>
                  prev < filteredTasks.length - 1 ? prev + 1 : prev,
                )
                break
              case 'ArrowUp':
                if (filteredTasks.length === 0) return
                e.preventDefault()
                setIsOpen(true)
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
                break
              case 'Enter':
                e.preventDefault()
                if (
                  highlightedIndex >= 0 &&
                  highlightedIndex < filteredTasks.length
                ) {
                  void handleSelectLink(filteredTasks[highlightedIndex])
                } else {
                  void handleCreate()
                }
                break
              case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                setHighlightedIndex(-1)
                inputRef.current?.blur()
                break
              default:
                break
            }
          }}
        />
        <button
          type="button"
          className={addButtonClassName}
          onClick={() => void handleCreate()}
          disabled={disabled || submitting || !query.trim()}
        >
          Add
        </button>
      </div>

      {/* Link matches dropdown */}
      {isOpen && query.trim() ? (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-outline-variant/30 bg-surface shadow-lg"
          role="listbox"
        >
          {loading ? (
            <div className="px-3 py-2 text-secondary text-on-surface-variant">
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="px-3 py-2 text-secondary text-on-surface-variant">
              No matching tasks — press Add to create a new subtask
            </div>
          ) : (
            filteredTasks.map((task, index) => (
              <button
                key={task.id}
                type="button"
                onClick={() => void handleSelectLink(task)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-variant/20 ${
                  index === highlightedIndex ? 'bg-surface-variant/20' : ''
                }`}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                Link: {task.title}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
