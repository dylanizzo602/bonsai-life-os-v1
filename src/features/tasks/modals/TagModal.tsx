/* TagModal: Popover for searching, adding, and managing task tags */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { Tag, TagColorId } from '../types'
import { DEFAULT_TAG_COLOR, getTagDotClass } from '../utils/tagColors'
import { EditTagModal } from './EditTagModal'

export interface TagModalProps {
  isOpen: boolean
  onClose: () => void
  value: Tag[]
  onSave: (tags: Tag[]) => void
  triggerRef: React.RefObject<HTMLElement | null>
  taskId?: string | null
  searchTags: (query: string) => Promise<Tag[]>
  createTag: (name: string, color: TagColorId) => Promise<Tag>
  updateTag?: (tagId: string, updates: { name?: string; color?: TagColorId }) => Promise<Tag>
  deleteTagFromAllTasks?: (tagId: string) => Promise<void>
}

/** Max tags per task */
const MAX_TAGS_PER_TASK = 3

export function TagModal({
  isOpen,
  onClose,
  value,
  onSave,
  triggerRef,
  taskId,
  searchTags,
  createTag,
  updateTag,
  deleteTagFromAllTasks,
}: TagModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  /* Local selected tags - synced with value when modal opens */
  const [selectedTags, setSelectedTags] = useState<Tag[]>(value)
  /* Search input value */
  const [searchQuery, setSearchQuery] = useState('')
  /* Filtered search results */
  const [searchResults, setSearchResults] = useState<Tag[]>([])
  /* Tag opened in the edit dialog */
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  /* Track previous open state: only sync from parent `value` when opening */
  const prevIsOpenRef = useRef(false)

  /* Sync selected tags from value only when the popover opens */
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSelectedTags(value)
      setSearchQuery('')
      setSearchResults([])
      setEditingTag(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    prevIsOpenRef.current = isOpen
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on open
  }, [isOpen])

  /* Search tags when query changes */
  useEffect(() => {
    if (!isOpen) return
    const run = async () => {
      const results = await searchTags(searchQuery)
      setSearchResults(results)
    }
    void run()
  }, [isOpen, searchQuery, searchTags])

  /* Position: center on mobile/tablet (< 1024px); below trigger on desktop */
  const DESKTOP_BREAKPOINT = 1024

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const vw = window.innerWidth
      const vh = window.innerHeight
      let top: number
      let left: number
      if (vw < DESKTOP_BREAKPOINT) {
        top = Math.max(padding, (vh - popoverRect.height) / 2)
        left = Math.max(padding, (vw - popoverRect.width) / 2)
      } else {
        if (!triggerRef.current) return
        const triggerRect = triggerRef.current.getBoundingClientRect()
        top = triggerRect.bottom + 4
        left = triggerRect.left
        if (left + popoverRect.width > vw - padding) left = vw - popoverRect.width - padding
        if (left < padding) left = padding
        if (top + popoverRect.height > vh - padding) top = triggerRect.top - popoverRect.height - 4
        if (top < padding) top = padding
      }
      setPosition({ top, left })
    }

    const timeoutId = setTimeout(calculatePosition, 0)
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, triggerRef, searchResults, editingTag])

  /* Close on click outside (skip while edit dialog is open) */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (editingTag) return
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onSave(selectedTags)
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, onSave, selectedTags, triggerRef, editingTag])

  /* Replace a tag in local lists after edit */
  const replaceTagInLists = useCallback((updated: Tag) => {
    setSelectedTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSearchResults((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setEditingTag((prev) => (prev?.id === updated.id ? updated : prev))
  }, [])

  /* Add tag to selection (existing or new) */
  const handleAddTag = useCallback(
    async (tag: Tag) => {
      if (selectedTags.length >= MAX_TAGS_PER_TASK) return
      if (selectedTags.some((t) => t.id === tag.id)) return
      const next = [...selectedTags, tag]
      setSelectedTags(next)
      onSave(next)
      setSearchQuery('')
      setSearchResults([])
    },
    [selectedTags, onSave],
  )

  /* Create new tag or add existing tag (when name matches) */
  const handleCreateAndAdd = useCallback(async () => {
    const name = searchQuery.trim()
    if (!name || selectedTags.length >= MAX_TAGS_PER_TASK) return
    if (selectedTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return

    const match = searchResults.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (match) {
      void handleAddTag(match)
      return
    }

    try {
      const tag = await createTag(name, DEFAULT_TAG_COLOR)
      const next = [...selectedTags, tag]
      setSelectedTags(next)
      onSave(next)
      setSearchQuery('')
      setSearchResults([])
    } catch {
      /* Error surfaced by createTag */
    }
  }, [searchQuery, selectedTags, searchResults, createTag, onSave, handleAddTag])

  /* Remove tag from selection */
  const handleRemoveFromTask = useCallback(
    (tagId: string) => {
      const next = selectedTags.filter((t) => t.id !== tagId)
      setSelectedTags(next)
      onSave(next)
    },
    [selectedTags, onSave],
  )

  /* Save edits from EditTagModal */
  const handleEditSave = useCallback(
    async (tagId: string, updates: { name: string; color: TagColorId }) => {
      if (!updateTag) return
      const updated = await updateTag(tagId, updates)
      replaceTagInLists(updated)
      const next = selectedTags.map((t) => (t.id === tagId ? updated : t))
      setSelectedTags(next)
      onSave(next)
    },
    [updateTag, replaceTagInLists, selectedTags, onSave],
  )

  /* Delete tag from all tasks via EditTagModal */
  const handleEditDelete = useCallback(
    async (tagId: string) => {
      if (!deleteTagFromAllTasks) return
      await deleteTagFromAllTasks(tagId)
      handleRemoveFromTask(tagId)
      setSearchResults((prev) => prev.filter((t) => t.id !== tagId))
    },
    [deleteTagFromAllTasks, handleRemoveFromTask],
  )

  /* Handle Enter in search - add existing match or create new */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return

    const match = searchResults.find((t) => t.name.toLowerCase() === q.toLowerCase())
    if (match) {
      void handleAddTag(match)
    } else {
      void handleCreateAndAdd()
    }
  }

  const atLimit = selectedTags.length >= MAX_TAGS_PER_TASK
  const trimmedQuery = searchQuery.trim()
  const listTags = searchResults
  const showCreateOption =
    Boolean(trimmedQuery) &&
    !atLimit &&
    !searchResults.some((t) => t.name.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !selectedTags.some((t) => t.name.toLowerCase() === trimmedQuery.toLowerCase())

  const isTagSelected = (tag: Tag) => selectedTags.some((t) => t.id === tag.id)

  if (!isOpen) return null

  /* Portal: render above fullscreen task modal */
  const overlay = (
    <div
      className="fixed inset-0 z-[9999]"
      aria-hidden
      onClick={() => {
        if (editingTag) return
        onSave(selectedTags)
        onClose()
      }}
    />
  )

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] w-full max-w-xs overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-label="Add or manage tags"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search header */}
      <div className="flex items-center gap-3 border-b border-outline-variant/10 bg-surface-container-low p-4">
        <MaterialIcon name="search" className="text-sm text-outline" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search or add tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-body w-full border-none bg-transparent p-0 text-on-surface placeholder:text-outline/60 focus:ring-0"
          aria-label="Search or add tags"
        />
      </div>

      {/* Existing tags list */}
      <div className="bonsai-scrollbar max-h-56 space-y-1 overflow-y-auto p-2">
        {listTags.length > 0 ? (
          listTags.map((tag) => {
            const selected = isTagSelected(tag)
            return (
              <div
                key={tag.id}
                className={`group flex items-center justify-between rounded-lg p-2 transition-all ${
                  selected ? 'bg-primary/5' : 'cursor-pointer hover:bg-surface-container-high'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (selected) {
                      handleRemoveFromTask(tag.id)
                    } else if (!atLimit) {
                      void handleAddTag(tag)
                    }
                  }}
                  disabled={!selected && atLimit}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className={`h-3 w-3 shrink-0 rounded-full ${getTagDotClass(tag.color)}`} />
                  <span className="text-secondary truncate font-medium text-on-surface">{tag.name}</span>
                  {selected && (
                    <MaterialIcon name="check" className="ml-auto shrink-0 text-xs text-primary" />
                  )}
                </button>
                {updateTag && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTag(tag)
                    }}
                    className="rounded p-1 opacity-0 transition-opacity hover:bg-surface-container-highest group-hover:opacity-100"
                    aria-label={`Edit ${tag.name}`}
                  >
                    <MaterialIcon name="more_horiz" className="text-xs text-outline" />
                  </button>
                )}
              </div>
            )
          })
        ) : (
          <p className="px-2 py-3 text-secondary text-outline/70">
            {trimmedQuery ? 'No matching tags.' : 'No tags yet — type a name to create one.'}
          </p>
        )}
      </div>

      {/* Create new tag option */}
      {showCreateOption && (
        <div className="mt-1 border-t border-outline-variant/10 p-2">
          <button
            type="button"
            onClick={() => void handleCreateAndAdd()}
            className="group flex w-full items-center justify-between rounded-lg p-2 text-primary transition-all hover:bg-primary/5"
          >
            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
              <MaterialIcon name="add" className="text-sm" />
              <span className="text-secondary truncate font-semibold">Create &quot;{trimmedQuery}&quot;</span>
            </div>
            <MaterialIcon
              name="keyboard_return"
              className="text-xs text-outline-variant transition-colors group-hover:text-primary"
            />
          </button>
        </div>
      )}

      {atLimit && (
        <p className="border-t border-outline-variant/10 px-4 py-2 text-secondary text-outline/70">
          Maximum {MAX_TAGS_PER_TASK} tags per task.
        </p>
      )}
    </div>
  )

  return createPortal(
    <>
      {overlay}
      {popover}
      <EditTagModal
        isOpen={editingTag != null}
        tag={editingTag}
        onClose={() => setEditingTag(null)}
        onSave={handleEditSave}
        onDelete={taskId && deleteTagFromAllTasks ? handleEditDelete : undefined}
      />
    </>,
    document.body,
  )
}
