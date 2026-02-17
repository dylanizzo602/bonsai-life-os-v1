/* SortModal: Modal popover for configuring task sort order (field + direction, reorderable) */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../../../components/Modal'
import { PlusIcon, CloseIcon, ChevronUpIcon, ChevronDownIcon } from '../../../components/icons'
import type { SortByEntry, SortFieldId } from '../types'

const SORT_FIELDS: { id: SortFieldId; label: string }[] = [
  { id: 'start_date', label: 'Start Date' },
  { id: 'due_date', label: 'Due Date' },
  { id: 'priority', label: 'Priority' },
  { id: 'time_estimate', label: 'Time Estimates' },
  { id: 'status', label: 'Status' },
  { id: 'task_name', label: 'Task Name' },
]

const DIRECTION_LABELS: Record<SortFieldId, { asc: string; desc: string }> = {
  start_date: { asc: 'Earliest first', desc: 'Latest first' },
  due_date: { asc: 'Earliest first', desc: 'Latest first' },
  priority: { asc: 'Lowest to highest', desc: 'Highest to lowest' },
  time_estimate: { asc: 'Lowest to highest', desc: 'Highest to lowest' },
  status: { asc: 'Open → In progress → Closed', desc: 'Closed → In progress → Open' },
  task_name: { asc: 'A–Z', desc: 'Z–A' },
}

export interface SortModalProps {
  isOpen: boolean
  onClose: () => void
  sortBy: SortByEntry[]
  onSortByChange: (sortBy: SortByEntry[]) => void
  onApply?: () => void
  /** Shown when sortBy is empty (e.g. "Default order (newest first)" for All Tasks view) */
  defaultSortLabel?: string
}

/**
 * Sort modal: add sort fields (plus), list of rows with field + direction, reorderable and removable.
 * Applying sort updates parent state and optionally switches to Custom view.
 */
export function SortModal({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  onApply,
  defaultSortLabel,
}: SortModalProps) {
  /* Local state: track sort order while editing (synced with prop when modal opens) */
  const [localSortBy, setLocalSortBy] = useState<SortByEntry[]>(sortBy)
  
  /* Sync local state with prop when modal opens or prop changes externally */
  useEffect(() => {
    if (isOpen) {
      setLocalSortBy(sortBy)
    }
  }, [isOpen, sortBy])
  
  /* Drag and drop state: track which item is being dragged */
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  /* Popover state: track if field selection popover is open */
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const addSortButtonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  /* Add sort: add a new sort field to the list (prevent duplicates) */
  const handleAddSort = (field: SortFieldId) => {
    // Check if field already exists
    if (localSortBy.some((entry) => entry.field === field)) {
      return // Field already exists, don't add duplicate
    }
    const direction: 'asc' | 'desc' = field === 'task_name' || field === 'start_date' || field === 'due_date' ? 'asc' : 'desc'
    const newSortBy: SortByEntry[] = [...localSortBy, { field, direction }]
    setLocalSortBy(newSortBy)
    onSortByChange(newSortBy)
    setIsPopoverOpen(false) // Close popover after adding
  }

  /* Remove sort: remove a sort field by index */
  const handleRemove = (index: number) => {
    const newSortBy = localSortBy.filter((_, i) => i !== index)
    setLocalSortBy(newSortBy)
    onSortByChange(newSortBy)
  }

  /* Toggle direction: switch between ascending and descending */
  const handleDirectionToggle = (index: number) => {
    const next = [...localSortBy]
    next[index] = { ...next[index], direction: next[index].direction === 'asc' ? 'desc' : 'asc' }
    setLocalSortBy(next)
    onSortByChange(next)
  }

  /* Drag start: begin dragging an item */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '') // Required for Firefox
  }

  /* Drag over: track which position we're hovering over */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      e.dataTransfer.dropEffect = 'move'
      setDragOverIndex(index)
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  /* Drag leave: clear hover state */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverIndex(null)
  }

  /* Drop: reorder items by moving dragged item to new position */
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedIndex === null) {
      setDragOverIndex(null)
      return
    }
    
    if (draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newSortBy = [...localSortBy]
    const [removed] = newSortBy.splice(draggedIndex, 1)
    newSortBy.splice(dropIndex, 0, removed)
    setLocalSortBy(newSortBy)
    onSortByChange(newSortBy)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  /* Drag end: cleanup drag state */
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  /* Apply: commit final state, then save changes and close modal */
  const handleApply = () => {
    onSortByChange(localSortBy)
    onApply?.()
    onClose()
  }

  /* Position popover: below button on desktop, centered on mobile */
  useEffect(() => {
    if (!isPopoverOpen || !popoverRef.current || !addSortButtonRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current || !addSortButtonRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const buttonRect = addSortButtonRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const DESKTOP_BREAKPOINT = 1024
      
      let top: number
      let left: number
      
      if (viewportWidth < DESKTOP_BREAKPOINT) {
        // Mobile/tablet: center popover
        top = Math.max(padding, (viewportHeight - popoverRect.height) / 2)
        left = Math.max(padding, (viewportWidth - popoverRect.width) / 2)
      } else {
        // Desktop: position below button
        top = buttonRect.bottom + 4
        left = buttonRect.left
        // Adjust if popover would overflow viewport
        if (left + popoverRect.width > viewportWidth - padding) {
          left = viewportWidth - popoverRect.width - padding
        }
        if (left < padding) left = padding
        if (top + popoverRect.height > viewportHeight - padding) {
          top = buttonRect.top - popoverRect.height - 4
        }
        if (top < padding) top = padding
      }
      
      setPopoverPosition({ top, left })
    }

    const timeoutId = setTimeout(calculatePosition, 0)
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isPopoverOpen])

  /* Close popover when clicking outside */
  useEffect(() => {
    if (!isPopoverOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        addSortButtonRef.current &&
        !addSortButtonRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPopoverOpen])

  /* Close popover when modal closes */
  useEffect(() => {
    if (!isOpen) {
      setIsPopoverOpen(false)
    }
  }, [isOpen])

  /* Get available fields: filter out already added fields */
  const availableFields = SORT_FIELDS.filter(
    (f) => !localSortBy.some((entry) => entry.field === f.id)
  )

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-4 py-2 text-body font-medium bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="rounded-lg px-4 py-2 text-body font-medium bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700"
      >
        Apply
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sort" fullScreenOnMobile footer={footer}>
      <div className="flex flex-col gap-4">
        <p className="text-secondary text-bonsai-slate-600">
          Tasks are sorted by the fields below in order. Drag items to reorder, click the arrow to reverse direction, and add levels with the plus button.
        </p>

        {/* Sort list: numbered rows with drag handle, field name, direction toggle (arrow), and remove; show default label when empty */}
        <div className="flex flex-col gap-2">
          {localSortBy.length === 0 && defaultSortLabel ? (
            <p className="text-secondary text-bonsai-slate-500 py-1">{defaultSortLabel}</p>
          ) : null}
          {localSortBy.map((entry, index) => (
            <div
              key={`sort-${index}-${entry.field}`}
              draggable={true}
              onDragStart={(e) => {
                // Only allow drag from the row itself, not from buttons
                const target = e.target as HTMLElement
                if (target.tagName === 'BUTTON' || target.closest('button')) {
                  e.preventDefault()
                  return
                }
                handleDragStart(e, index)
              }}
              onDragOver={(e) => {
                if (draggedIndex !== null) {
                  handleDragOver(e, index)
                }
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                draggedIndex === index
                  ? 'opacity-50 border-bonsai-sage-400 bg-bonsai-sage-50/50'
                  : dragOverIndex === index
                  ? 'border-bonsai-sage-500 bg-bonsai-sage-100/50'
                  : 'border-bonsai-slate-200 bg-bonsai-slate-50/50'
              } cursor-move hover:border-bonsai-slate-300`}
            >
              {/* Number slot: display position number */}
              <div className="text-secondary font-semibold text-bonsai-slate-600 w-6 flex-shrink-0 select-none">
                {index + 1}.
              </div>
              
              {/* Field name: display sort field label */}
              <div className="text-body font-medium text-bonsai-slate-800 flex-1 select-none">
                {SORT_FIELDS.find((f) => f.id === entry.field)?.label ?? entry.field}
              </div>
              
              {/* Direction toggle: arrow button with direction label */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDirectionToggle(index)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-secondary text-bonsai-slate-600 hover:text-bonsai-slate-800 hover:bg-bonsai-slate-100 transition-colors cursor-pointer"
                aria-label={`Toggle sort direction: ${DIRECTION_LABELS[entry.field]?.[entry.direction] ?? entry.direction}`}
              >
                {entry.direction === 'asc' ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {DIRECTION_LABELS[entry.field]?.[entry.direction] ?? entry.direction}
                </span>
              </button>
              
              {/* Remove button: delete this sort field */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(index)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                className="p-1.5 rounded-full text-bonsai-slate-500 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700 flex-shrink-0 cursor-pointer"
                aria-label="Remove sort"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add sort: plus button opens popover to pick field */}
        <div className="relative">
          <button
            ref={addSortButtonRef}
            type="button"
            onClick={() => setIsPopoverOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-body font-medium text-bonsai-sage-700 bg-bonsai-sage-100 hover:bg-bonsai-sage-200"
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            disabled={availableFields.length === 0}
          >
            <PlusIcon className="w-4 h-4" />
            Add sort
          </button>
          
          {/* Popover: show available fields when button is clicked */}
          {isPopoverOpen && availableFields.length > 0 && createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[10000] flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-lg border border-bonsai-slate-200 bg-white shadow-lg"
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
              }}
              role="menu"
              aria-label="Add sort field"
            >
              <div className="flex flex-col p-1.5 min-w-[180px]">
                {availableFields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => handleAddSort(field.id)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors bg-white text-bonsai-slate-800 hover:bg-bonsai-slate-50 text-left"
                    role="menuitem"
                  >
                    <span className="text-xs">{field.label}</span>
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </Modal>
  )
}
