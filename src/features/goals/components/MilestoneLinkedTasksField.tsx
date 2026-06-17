/* MilestoneLinkedTasksField: Multi-select task search with removable chips */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { TaskOption } from '../../../components/TaskSearchSelect'

export interface MilestoneLinkedTasksFieldProps {
  /** Fetch tasks to search through */
  getTasks: () => Promise<Array<TaskOption>>
  /** Currently selected tasks */
  selectedTasks: TaskOption[]
  /** Called when selection changes */
  onChange: (tasks: TaskOption[]) => void
  disabled?: boolean
}

/**
 * Search-and-chip field for linking multiple tasks to a task-type milestone.
 */
export function MilestoneLinkedTasksField({
  getTasks,
  selectedTasks,
  onChange,
  disabled = false,
}: MilestoneLinkedTasksFieldProps) {
  /* Search state: query text and dropdown visibility */
  const [searchQuery, setSearchQuery] = useState('')
  const [allTasks, setAllTasks] = useState<TaskOption[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedIds = useMemo(() => new Set(selectedTasks.map((t) => t.id)), [selectedTasks])

  /* Fetch tasks on first focus */
  const fetchTasks = useCallback(() => {
    if (loading || allTasks.length > 0) return
    setLoading(true)
    getTasks()
      .then((tasks) => {
        const options: TaskOption[] = (tasks ?? []).map((t) => ({
          id: t.id,
          title: typeof t.title === 'string' ? t.title : '',
        }))
        setAllTasks(options)
      })
      .catch((err) => {
        console.error('Error fetching tasks for milestone link:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [allTasks.length, getTasks, loading])

  useEffect(() => {
    if (isOpen) fetchTasks()
  }, [isOpen, fetchTasks])

  /* Filter search results, excluding already-selected tasks */
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    return allTasks
      .filter((task) => !selectedIds.has(task.id))
      .filter(
        (task) =>
          task.title && typeof task.title === 'string' && task.title.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        const aTitle = (a.title ?? '').toLowerCase()
        const bTitle = (b.title ?? '').toLowerCase()
        const aIndex = aTitle.indexOf(query)
        const bIndex = bTitle.indexOf(query)
        if (aIndex === bIndex) return aTitle.localeCompare(bTitle)
        return aIndex - bIndex
      })
      .slice(0, 5)
  }, [allTasks, searchQuery, selectedIds])

  /* Add a task to the selection */
  const handleSelectTask = useCallback(
    (task: TaskOption) => {
      if (selectedIds.has(task.id)) return
      onChange([...selectedTasks, task])
      setSearchQuery('')
      setIsOpen(false)
      setHighlightedIndex(-1)
      inputRef.current?.focus()
    },
    [onChange, selectedIds, selectedTasks],
  )

  /* Remove a task from the selection */
  const handleRemoveTask = useCallback(
    (taskId: string) => {
      onChange(selectedTasks.filter((t) => t.id !== taskId))
    },
    [onChange, selectedTasks],
  )

  /* Keyboard navigation for dropdown */
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
          if (highlightedIndex >= 0 && highlightedIndex < filteredTasks.length) {
            handleSelectTask(filteredTasks[highlightedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    },
    [disabled, filteredTasks, highlightedIndex, handleSelectTask],
  )

  /* Close dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="space-y-2">
      <label className="block text-secondary font-semibold text-on-surface-variant">
        Linked Tasks
      </label>

      <div ref={containerRef} className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value
            setSearchQuery(val)
            setIsOpen(val.trim().length > 0)
            setHighlightedIndex(-1)
          }}
          onFocus={() => {
            fetchTasks()
            if (searchQuery.trim()) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search for existing tasks..."
          className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-2.5 pl-10 pr-4 text-secondary transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          aria-label="Search for tasks to link"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />

        {isOpen && searchQuery.trim() && (
          <div
            className="absolute z-50 mt-1 w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-lg"
            role="listbox"
          >
            {loading ? (
              <div className="px-4 py-3 text-secondary text-on-surface-variant">
                Loading tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="px-4 py-3 text-secondary text-on-surface-variant">
                No tasks found matching your search
              </div>
            ) : (
              filteredTasks.map((task, index) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => handleSelectTask(task)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-2 text-left text-body transition-colors hover:bg-surface-container-low ${
                    index === highlightedIndex ? 'bg-surface-container-low' : ''
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

      {/* Selected task chips */}
      {selectedTasks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedTasks.map((task) => (
            <span
              key={task.id}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-secondary text-primary"
            >
              {task.title}
              <button
                type="button"
                onClick={() => handleRemoveTask(task.id)}
                disabled={disabled}
                className="flex items-center transition-opacity hover:opacity-70 disabled:cursor-not-allowed"
                aria-label={`Remove ${task.title}`}
              >
                <MaterialIcon name="close" className="text-[14px]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
