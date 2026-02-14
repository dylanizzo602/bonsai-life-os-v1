/* TagModal: Popover for searching/creating tags, selecting colors, and managing task tags */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Tag, TagColorId } from '../types'

/* Color palette: Tag color options for new tags (matches plan) */
const TAG_COLORS: { id: TagColorId; bgClass: string; textClass: string }[] = [
  { id: 'slate', bgClass: 'bg-bonsai-slate-100', textClass: 'text-bonsai-slate-700' },
  { id: 'mint', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' },
  { id: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  { id: 'lavender', bgClass: 'bg-violet-100', textClass: 'text-violet-800' },
  { id: 'yellow', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  { id: 'periwinkle', bgClass: 'bg-indigo-100', textClass: 'text-indigo-800' },
]

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

/** Get Tailwind classes for a tag pill by color id */
function getTagClasses(color: TagColorId): string {
  const found = TAG_COLORS.find((c) => c.id === color)
  return found ? `${found.bgClass} ${found.textClass}` : `${TAG_COLORS[0].bgClass} ${TAG_COLORS[0].textClass}`
}

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
  /* Selected color for new tags */
  const [selectedColor, setSelectedColor] = useState<TagColorId>('slate')
  /* Show delete-from-all confirmation */
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<Tag | null>(null)
  /* Tag being edited (inline name edit) */
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  /* Tag whose color is being changed (swatches apply to this tag) */
  const [editingColorTagId, setEditingColorTagId] = useState<string | null>(null)

  /* Sync selected tags from value when modal opens */
  useEffect(() => {
    if (isOpen) {
      setSelectedTags(value)
      setSearchQuery('')
      setSearchResults([])
      setDeleteConfirmTag(null)
      setEditingTagId(null)
      setEditingColorTagId(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, value])

  /* Search tags when query changes */
  useEffect(() => {
    if (!isOpen) return
    const run = async () => {
      const results = await searchTags(searchQuery)
      setSearchResults(results)
    }
    run()
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
  }, [isOpen, triggerRef, selectedTags, searchResults])

  /* Close on click outside */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
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
  }, [isOpen, onClose, onSave, selectedTags, triggerRef])

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
  const handleCreateAndAdd = useCallback(
    async () => {
      const name = searchQuery.trim()
      if (!name || selectedTags.length >= MAX_TAGS_PER_TASK) return
      if (selectedTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return

      /* If exact match in search results, add existing tag */
      const match = searchResults.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (match) {
        handleAddTag(match)
        setSearchQuery('')
        setSearchResults([])
        return
      }

      try {
        const tag = await createTag(name, selectedColor)
        const next = [...selectedTags, tag]
        setSelectedTags(next)
        onSave(next)
        setSearchQuery('')
        setSearchResults([])
      } catch {
        /* Error surfaced by createTag */
      }
    },
    [searchQuery, selectedColor, selectedTags, searchResults, createTag, onSave, handleAddTag],
  )

  /* Remove tag from selection */
  const handleRemoveFromTask = useCallback(
    (tag: Tag) => {
      const next = selectedTags.filter((t) => t.id !== tag.id)
      setSelectedTags(next)
      onSave(next)
      setDeleteConfirmTag(null)
    },
    [selectedTags, onSave],
  )

  /* Start editing a tag's name */
  const handleStartEdit = useCallback((tag: Tag) => {
    setEditingTagId(tag.id)
    setEditingTagName(tag.name)
  }, [])

  /* Save edited tag name */
  const handleSaveEdit = useCallback(
    async () => {
      const tagId = editingTagId
      const name = editingTagName.trim()
      if (!tagId || !name || !updateTag) {
        setEditingTagId(null)
        return
      }
      const tag = selectedTags.find((t) => t.id === tagId)
      if (!tag) {
        setEditingTagId(null)
        return
      }
      if (name === tag.name) {
        setEditingTagId(null)
        return
      }

      try {
        const updated = await updateTag(tagId, { name })
        const next = selectedTags.map((t) => (t.id === tagId ? updated : t))
        setSelectedTags(next)
        onSave(next)
      } catch {
        /* Error surfaced by updateTag */
      }
      setEditingTagId(null)
    },
    [editingTagId, editingTagName, selectedTags, updateTag, onSave],
  )

  /* Cancel editing */
  const handleCancelEdit = useCallback(() => {
    setEditingTagId(null)
    setEditingColorTagId(null)
  }, [])

  /* Change color of an existing tag */
  const handleChangeTagColor = useCallback(
    async (tagId: string, color: TagColorId) => {
      if (!updateTag) return
      const tag = selectedTags.find((t) => t.id === tagId)
      if (!tag || tag.color === color) {
        setEditingColorTagId(null)
        return
      }
      try {
        const updated = await updateTag(tagId, { color })
        const next = selectedTags.map((t) => (t.id === tagId ? updated : t))
        setSelectedTags(next)
        onSave(next)
      } catch {
        /* Error surfaced by updateTag */
      }
      setEditingColorTagId(null)
    },
    [selectedTags, updateTag, onSave],
  )

  /* Delete tag from all tasks (with confirmation) */
  const handleDeleteFromAll = useCallback(
    async (tag: Tag) => {
      if (!deleteTagFromAllTasks) return
      try {
        await deleteTagFromAllTasks(tag.id)
        handleRemoveFromTask(tag)
      } catch {
        /* Error surfaced */
      }
      setDeleteConfirmTag(null)
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
      handleAddTag(match)
    } else {
      handleCreateAndAdd()
    }
  }

  const atLimit = selectedTags.length >= MAX_TAGS_PER_TASK

  if (!isOpen) return null

  return (
    <>
      <div
        ref={popoverRef}
        className="fixed z-50 flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-lg border border-bonsai-slate-200 bg-white shadow-lg min-w-[280px] max-w-[320px]"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        role="dialog"
        aria-label="Add or manage tags"
      >
        {/* Search/create input with explicit Create button; shrink-0 */}
        <div className="shrink-0 space-y-2 p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or create tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-lg border border-bonsai-slate-300 px-3 py-2 text-sm text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent"
              aria-label="Search or create tag"
            />
            <button
              type="button"
              onClick={handleCreateAndAdd}
              disabled={!searchQuery.trim() || atLimit}
              className="rounded-lg bg-bonsai-sage-600 px-3 py-2 text-sm font-medium text-white hover:bg-bonsai-sage-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
          {searchQuery.trim() && !atLimit && (
            <p className="text-xs text-bonsai-slate-500">
              {searchResults.some((t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase())
                ? 'Press Create to add existing tag, or pick from list below'
                : 'Press Create or Enter to save as new tag'}
            </p>
          )}
        </div>

        {/* Search results list; shrink-0 so height is bounded */}
        {searchQuery.trim() && (
          <div className="max-h-32 shrink-0 overflow-hidden border-t border-bonsai-slate-100 px-3 py-2">
            {searchResults.length > 0 ? (
              <ul className="space-y-0.5">
                {searchResults
                  .filter((t) => !selectedTags.some((s) => s.id === t.id))
                  .slice(0, 5)
                  .map((tag) => (
                    <li key={tag.id}>
                      <button
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        disabled={atLimit}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-bonsai-slate-50 disabled:opacity-50"
                      >
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${getTagClasses(tag.color as TagColorId)}`}
                        >
                          {tag.name}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            ) : null}
            {searchQuery.trim() &&
              !searchResults.some((t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase()) &&
              !selectedTags.some((t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleCreateAndAdd}
                  disabled={atLimit}
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-bonsai-sage-600 hover:bg-bonsai-slate-50 disabled:opacity-50"
                >
                  Create &quot;{searchQuery.trim()}&quot;
                </button>
              )}
          </div>
        )}

        {/* Selected tags with remove / delete-from-all; flex-1 min-h-0 so content fits in viewport */}
        <div className="min-h-0 flex-1 overflow-hidden border-t border-bonsai-slate-100 px-3 py-2">
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((tag) => (
                <div
                  key={tag.id}
                  className="group relative inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                >
                  {editingTagId === tag.id ? (
                    <span className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={editingTagName}
                        onChange={(e) => setEditingTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        onBlur={handleSaveEdit}
                        autoFocus
                        className="w-24 rounded border border-bonsai-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-bonsai-sage-500"
                        aria-label="Edit tag name"
                      />
                      <span className="flex gap-1">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleChangeTagColor(tag.id, c.id)}
                            className={`h-4 w-4 rounded border ${
                              (tag.color as TagColorId) === c.id
                                ? 'border-bonsai-slate-600'
                                : 'border-transparent hover:border-bonsai-slate-400'
                            } ${c.bgClass}`}
                            aria-label={`Set color to ${c.id}`}
                          />
                        ))}
                      </span>
                    </span>
                  ) : deleteConfirmTag?.id === tag.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteFromAll(tag)}
                        className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 hover:bg-red-200"
                      >
                        Delete everywhere
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTag(null)}
                        className="rounded bg-bonsai-slate-100 px-1.5 py-0.5 text-bonsai-slate-600"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <>
                      <span
                        className={`rounded px-2 py-0.5 ${getTagClasses(tag.color as TagColorId)}`}
                      >
                        {tag.name}
                      </span>
                      {updateTag && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingColorTagId(editingColorTagId === tag.id ? null : tag.id)}
                            className="rounded p-0.5 text-bonsai-slate-400 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700"
                            aria-label={`Change color of ${tag.name}`}
                            title="Change tag color"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(tag)}
                            className="rounded p-0.5 text-bonsai-slate-400 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700"
                            aria-label={`Edit ${tag.name}`}
                            title="Edit tag name"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromTask(tag)}
                        className="rounded p-0.5 text-bonsai-slate-500 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700"
                        aria-label={`Remove ${tag.name} from task`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {deleteTagFromAllTasks && taskId && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTag(tag)}
                          className="rounded p-0.5 text-bonsai-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                          aria-label={`Delete ${tag.name} from all tasks`}
                          title="Delete from all tasks"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : null}
          {atLimit && <p className="mt-1 text-xs text-bonsai-slate-500">Maximum 3 tags per task.</p>}
        </div>

        {/* Color swatches: for new tags or for tag being color-edited */}
        <div className="border-t border-bonsai-slate-100 px-3 py-2">
          <p className="mb-1.5 text-xs text-bonsai-slate-500">
            {editingColorTagId
              ? `Change color for "${selectedTags.find((t) => t.id === editingColorTagId)?.name ?? ''}"`
              : 'Tag color (for new tags)'}
          </p>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => {
              const isForNewTag = !editingColorTagId
              const isSelected = isForNewTag
                ? selectedColor === c.id
                : selectedTags.find((t) => t.id === editingColorTagId)?.color === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (editingColorTagId) {
                      handleChangeTagColor(editingColorTagId, c.id)
                    } else {
                      setSelectedColor(c.id)
                    }
                  }}
                  className={`h-6 w-6 rounded border-2 transition-colors ${
                    isSelected ? 'border-bonsai-slate-600' : 'border-bonsai-slate-200 hover:border-bonsai-slate-400'
                  } ${c.bgClass}`}
                  aria-label={editingColorTagId ? `Set color to ${c.id}` : `Select ${c.id} for new tags`}
                  title={c.id}
                />
              )
            })}
          </div>
          <p className="mt-2 text-xs text-bonsai-slate-500">
            {editingColorTagId
              ? 'Click a color to update'
              : 'Type a name and click Create to add a new tag'}
          </p>
        </div>
      </div>
    </>
  )
}
