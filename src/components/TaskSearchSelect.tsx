/* TaskSearchSelect component: Reusable search input with dropdown for selecting tasks */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Input } from './Input'

export interface TaskOption {
  id: string
  title: string
}

export interface TaskSearchSelectProps {
  /** Fetch tasks to search through */
  getTasks: () => Promise<Array<TaskOption>>
  /** Called when user selects a task */
  onSelectTask: (task: TaskOption) => void | Promise<void>
  /** Task IDs to exclude from results (e.g. current task) */
  excludeTaskIds?: string[]
  /** Placeholder text for input */
  placeholder?: string
  /** Label for the input */
  label?: string
  /** Disable the input */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** ARIA label for accessibility */
  'aria-label'?: string
}

/**
 * Reusable task search and select component.
 * Provides a search input with a dropdown list of matching tasks.
 * User can type to filter, use arrow keys to navigate, Enter to select, or click to select.
 * Designed for reuse across different widgets (dependencies, task linking, etc.).
 */
export function TaskSearchSelect({
  getTasks,
  onSelectTask,
  excludeTaskIds = [],
  placeholder = 'Search tasks by name...',
  label,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: TaskSearchSelectProps) {
  /* Search query state: user's typed text */
  const [searchQuery, setSearchQuery] = useState('')
  /* All available tasks: fetched once when dropdown opens */
  const [allTasks, setAllTasks] = useState<TaskOption[]>([])
  /* Loading state: true while fetching tasks */
  const [loading, setLoading] = useState(false)
  /* Dropdown visibility: true when input is focused or has search query */
  const [isOpen, setIsOpen] = useState(false)
  /* Keyboard navigation: index of highlighted item in dropdown */
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  /* Container ref: used for click-outside detection */
  const containerRef = useRef<HTMLDivElement>(null)
  /* Input ref: used for focus management */
  const inputRef = useRef<HTMLInputElement>(null)

  /* Fetch tasks when dropdown opens for the first time */
  useEffect(() => {
    if (isOpen && allTasks.length === 0 && !loading) {
      setLoading(true)
      getTasks()
        .then((tasks) => {
          setAllTasks(tasks)
        })
        .catch((err) => {
          console.error('Error fetching tasks for search:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, allTasks.length, loading, getTasks])

  /* Filter tasks by search query, exclude specified IDs, sort by closest match, and limit to 3 results */
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    
    /* If no search query, don't show any results */
    if (!query) {
      return []
    }

    /* Filter out excluded tasks and tasks that don't match the query */
    let filtered = allTasks
      .filter((task) => !excludeTaskIds.includes(task.id))
      .filter((task) => task.title.toLowerCase().includes(query))

    /* Sort by match position: tasks where query appears earlier in title rank higher */
    filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      const aIndex = aTitle.indexOf(query)
      const bIndex = bTitle.indexOf(query)
      
      /* If both match at same position, sort alphabetically */
      if (aIndex === bIndex) {
        return aTitle.localeCompare(bTitle)
      }
      
      /* Earlier match position = better match */
      return aIndex - bIndex
    })

    /* Limit to top 3 closest matches */
    return filtered.slice(0, 3)
  }, [allTasks, searchQuery, excludeTaskIds])

  /* Handle task selection: call onSelectTask and reset state */
  const handleSelectTask = useCallback(
    async (task: TaskOption) => {
      try {
        await onSelectTask(task)
        setSearchQuery('')
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
      } catch (err) {
        console.error('Error selecting task:', err)
      }
    },
    [onSelectTask],
  )

  /* Handle input change: update search query and open dropdown if query exists */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      /* Only open dropdown if there's a search query */
      setIsOpen(value.trim().length > 0)
      setHighlightedIndex(-1)
    },
    [],
  )

  /* Handle input focus: open dropdown only if there's a search query */
  const handleInputFocus = useCallback(() => {
    if (!disabled && searchQuery.trim()) {
      setIsOpen(true)
    }
  }, [disabled, searchQuery])

  /* Handle keyboard navigation: arrow keys, Enter, Escape */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setIsOpen(true)
          setHighlightedIndex((prev) =>
            prev < filteredTasks.length - 1 ? prev + 1 : prev,
          )
          break
        case 'ArrowUp':
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
            handleSelectTask(filteredTasks[highlightedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          inputRef.current?.blur()
          break
      }
    },
    [disabled, filteredTasks, highlightedIndex, handleSelectTask],
  )

  /* Handle click outside: close dropdown */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search input: user types to filter tasks */}
      <Input
        ref={inputRef}
        label={label}
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
      />

      {/* Dropdown list: shows filtered tasks when open and search query exists */}
      {isOpen && searchQuery.trim() && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-bonsai-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {loading ? (
            /* Loading state: show while fetching tasks */
            <div className="px-4 py-3 text-secondary text-bonsai-slate-500">
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            /* Empty state: no tasks match search */
            <div className="px-4 py-3 text-secondary text-bonsai-slate-500">
              No tasks found matching your search
            </div>
          ) : (
            /* Task list: render filtered tasks */
            filteredTasks.map((task, index) => (
              <button
                key={task.id}
                type="button"
                onClick={() => handleSelectTask(task)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-2 text-body text-bonsai-slate-700 hover:bg-bonsai-slate-100 focus:bg-bonsai-slate-100 focus:outline-none ${
                  index === highlightedIndex
                    ? 'bg-bonsai-slate-100'
                    : 'bg-white'
                }`}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                {task.title}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
