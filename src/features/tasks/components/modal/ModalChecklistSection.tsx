/* ModalChecklistSection: Checklist block for add/edit task and subtask modals */

import { useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { Input } from '../../../../components/Input'
import { Button } from '../../../../components/Button'
import { ChecklistIcon } from '../../../../components/icons'
import type { ChecklistWithItems } from '../../hooks/useTaskChecklists'
import { ChecklistItemRow } from './ChecklistItemRow'
import type { DraftChecklist, DraftChecklistItem } from './modalChecklistTypes'
import { newDraftChecklistId } from './modalChecklistTypes'

export type { DraftChecklist, DraftChecklistItem } from './modalChecklistTypes'
export { newDraftChecklistId } from './modalChecklistTypes'

/** Input key for the add row when no checklist exists yet */
const NEW_LIST_INPUT_KEY = '__new__'

/* Shared props for both draft and persisted modes */
interface ModalChecklistSectionBaseProps {
  /** When false, show disabled message instead of add controls (e.g. subtask not saved yet) */
  canEdit?: boolean
  /** Message when canEdit is false */
  disabledMessage?: string
}

/* Draft mode: checklists live in parent state until task create */
export interface ModalChecklistSectionDraftProps extends ModalChecklistSectionBaseProps {
  mode: 'draft'
  draftChecklists: DraftChecklist[]
  onDraftChecklistsChange: (
    updater: (prev: DraftChecklist[]) => DraftChecklist[],
  ) => void
}

/* Persisted mode: checklists from useTaskChecklists hook */
export interface ModalChecklistSectionPersistedProps extends ModalChecklistSectionBaseProps {
  mode: 'persisted'
  checklists: ChecklistWithItems[]
  loading: boolean
  onAddItemOrCreateChecklist: (title: string) => void
  onAddItemsOrCreateChecklist: (titles: string[]) => Promise<void>
  onAddChecklist: (title: string) => void
  onAddItemToList: (checklistId: string, title: string) => void
  onAddItemsToList: (checklistId: string, titles: string[]) => Promise<void>
  onToggleItem: (itemId: string, completed: boolean) => void
  onUpdateItemTitle: (itemId: string, title: string) => void
  onDeleteItem: (itemId: string) => void
  onUpdateChecklistTitle: (checklistId: string, title: string) => void
  onDeleteChecklist: (checklistId: string) => void
}

export type ModalChecklistSectionProps =
  | ModalChecklistSectionDraftProps
  | ModalChecklistSectionPersistedProps

/**
 * Full checklist section for task modals: renameable header, inline items,
 * add-item row, and create-new-list control in the section header.
 */
export function ModalChecklistSection(props: ModalChecklistSectionProps) {
  const canEdit = props.canEdit ?? true
  const disabledMessage =
    props.disabledMessage ?? 'Save the task first to add checklists.'

  /* Per-list add-item input and multi-line paste state */
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({})
  const [pendingPaste, setPendingPaste] = useState<{
    listId: string | null
    lines: string[]
  } | null>(null)

  /* Shared field + button classes for the add-item row */
  const addFieldClassName =
    'flex-1 bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none'
  const addButtonClassName =
    'px-6 py-2 bg-surface-variant/20 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-variant/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0'

  /* Inline edit state for items and list titles */
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('')
  /* Per-list visibility for completed checklist items (default: show) */
  const [showCompletedByList, setShowCompletedByList] = useState<Record<string, boolean>>({})

  const loading = props.mode === 'persisted' ? props.loading : false

  /* Resolve input key for a checklist add row (null = no lists yet) */
  const listInputKey = (listId: string | null) => listId ?? NEW_LIST_INPUT_KEY

  /* Read/write add-item text for a specific checklist */
  const getNewItemText = (listId: string | null) =>
    newChecklistItems[listInputKey(listId)] ?? ''

  const setNewItemText = (listId: string | null, text: string) => {
    const key = listInputKey(listId)
    setNewChecklistItems((prev) => ({ ...prev, [key]: text }))
  }

  /* Whether completed items are visible for a given checklist */
  const isShowingCompleted = (listId: string) => showCompletedByList[listId] !== false

  const toggleShowCompleted = (listId: string) => {
    setShowCompletedByList((prev) => ({
      ...prev,
      [listId]: !isShowingCompleted(listId),
    }))
  }

  /* Resolve checklist lists for rendering */
  const lists: Array<{ id: string; title: string; items: DraftChecklistItem[] }> =
    props.mode === 'draft'
      ? props.draftChecklists
      : props.checklists.map((c) => ({
          id: c.id,
          title: c.title,
          items: c.items.map((i) => ({
            id: i.id,
            title: i.title,
            completed: i.completed,
          })),
        }))

  const showListHeaders = lists.length > 1
  const singleList = lists.length === 1 ? lists[0] : null

  /* Default title for a newly created checklist list */
  const nextDefaultListTitle = () => {
    const base = 'Checklist'
    const existing = new Set(lists.map((l) => l.title.toLowerCase()))
    if (!existing.has(base.toLowerCase())) return base
    let n = 2
    while (existing.has(`${base} ${n}`.toLowerCase())) n += 1
    return `${base} ${n}`
  }

  /* Add a checklist item in draft mode (null listId creates the first checklist) */
  const handleDraftAddItem = (listId: string | null, rawTitle: string) => {
    if (props.mode !== 'draft') return
    const trimmed = rawTitle.trim()
    if (!trimmed) return
    props.onDraftChecklistsChange((prev) => {
      if (prev.length === 0 || listId === null) {
        return [
          {
            id: newDraftChecklistId('draft-cl'),
            title: 'Checklist',
            items: [
              { id: newDraftChecklistId('draft-item'), title: trimmed, completed: false },
            ],
          },
        ]
      }
      return prev.map((cl) =>
        cl.id === listId
          ? {
              ...cl,
              items: [
                ...cl.items,
                { id: newDraftChecklistId('draft-item'), title: trimmed, completed: false },
              ],
            }
          : cl,
      )
    })
  }

  /* Per-list add row: create item in draft or persisted mode */
  const handleAddItem = (listId: string | null) => {
    const next = getNewItemText(listId).trim()
    if (!next) return
    if (props.mode === 'draft') {
      handleDraftAddItem(listId, next)
    } else if (listId) {
      props.onAddItemToList(listId, next)
    } else {
      props.onAddItemOrCreateChecklist(next)
    }
    setNewItemText(listId, '')
  }

  /* Create a new empty checklist list (header button) */
  const handleCreateNewList = () => {
    const title = nextDefaultListTitle()
    if (props.mode === 'draft') {
      props.onDraftChecklistsChange((prev) => [
        ...prev,
        { id: newDraftChecklistId('draft-cl'), title, items: [] },
      ])
    } else {
      props.onAddChecklist(title)
    }
  }

  /* Toggle item completion */
  const handleToggleItem = (listId: string, itemId: string, completed: boolean) => {
    if (props.mode === 'draft') {
      props.onDraftChecklistsChange((prev) =>
        prev.map((d) =>
          d.id !== listId
            ? d
            : {
                ...d,
                items: d.items.map((i) => (i.id === itemId ? { ...i, completed } : i)),
              },
        ),
      )
    } else {
      props.onToggleItem(itemId, completed)
    }
  }

  /* Save item title after inline edit */
  const handleSaveItemTitle = (listId: string, itemId: string) => {
    const next = editingItemTitle.trim()
    if (!next) {
      setEditingItemId(null)
      return
    }
    if (props.mode === 'draft') {
      props.onDraftChecklistsChange((prev) =>
        prev.map((d) =>
          d.id !== listId
            ? d
            : {
                ...d,
                items: d.items.map((i) => (i.id === itemId ? { ...i, title: next } : i)),
              },
        ),
      )
    } else {
      props.onUpdateItemTitle(itemId, next)
    }
    setEditingItemId(null)
  }

  /* Delete checklist item */
  const handleDeleteItem = (listId: string, itemId: string) => {
    if (props.mode === 'draft') {
      props.onDraftChecklistsChange((prev) =>
        prev.map((d) =>
          d.id !== listId ? d : { ...d, items: d.items.filter((i) => i.id !== itemId) },
        ),
      )
    } else {
      props.onDeleteItem(itemId)
    }
    if (editingItemId === itemId) setEditingItemId(null)
  }

  /* Save checklist list title after inline edit */
  const handleSaveChecklistTitle = (listId: string) => {
    const next = editingChecklistTitle.trim()
    if (!next) {
      setEditingChecklistId(null)
      return
    }
    if (props.mode === 'draft') {
      props.onDraftChecklistsChange((prev) =>
        prev.map((d) => (d.id === listId ? { ...d, title: next } : d)),
      )
    } else {
      props.onUpdateChecklistTitle(listId, next)
    }
    setEditingChecklistId(null)
  }

  /* Delete entire checklist list */
  const handleDeleteChecklist = (listId: string) => {
    if (props.mode === 'draft') {
      props.onDraftChecklistsChange((prev) => prev.filter((d) => d.id !== listId))
    } else {
      props.onDeleteChecklist(listId)
    }
    if (editingChecklistId === listId) {
      setEditingChecklistId(null)
      setEditingChecklistTitle('')
    }
  }

  /* Multi-line paste prompt for a checklist's add input */
  const renderPastePrompt = (listId: string | null) => {
    if (!pendingPaste || pendingPaste.listId !== listId || pendingPaste.lines.length <= 1) {
      return null
    }
    const { lines } = pendingPaste
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-variant/10 px-3 py-2 text-body">
        <span className="flex items-center gap-2 text-on-surface">
          <ChecklistIcon className="h-4 w-4 shrink-0 text-on-surface-variant" />
          Multiple lines detected in the pasted text.
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (props.mode === 'draft') {
                handleDraftAddItem(listId, lines.join(' '))
              } else if (listId) {
                props.onAddItemToList(listId, lines.join(' '))
              } else {
                props.onAddItemOrCreateChecklist(lines.join(' '))
              }
              setNewItemText(listId, '')
              setPendingPaste(null)
            }}
            disabled={loading}
          >
            Keep 1 item
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              if (props.mode === 'draft') {
                for (const line of lines) {
                  handleDraftAddItem(listId, line)
                }
              } else if (listId) {
                await props.onAddItemsToList(listId, lines)
              } else {
                await props.onAddItemsOrCreateChecklist(lines)
              }
              setNewItemText(listId, '')
              setPendingPaste(null)
            }}
            disabled={loading}
          >
            Create {lines.length} items
          </Button>
        </div>
      </div>
    )
  }

  /* Per-checklist add-item row */
  const renderAddItemRow = (listId: string | null) => {
    const value = getNewItemText(listId)
    return (
      <div className="flex gap-2">
        <input
          className={addFieldClassName}
          placeholder="Create a checklist item"
          type="text"
          value={value}
          onChange={(e) => setNewItemText(listId, e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            const pastedLines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            if (pastedLines.length > 1) {
              e.preventDefault()
              setPendingPaste({ listId, lines: pastedLines })
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            handleAddItem(listId)
          }}
          disabled={props.mode === 'persisted' ? loading : false}
        />
        <button
          type="button"
          className={addButtonClassName}
          onClick={() => handleAddItem(listId)}
          disabled={!value.trim() || (props.mode === 'persisted' ? loading : false)}
        >
          Add
        </button>
      </div>
    )
  }

  /* Per-checklist show/hide completed items toggle */
  const renderHideClosedToggle = (listId: string, items: DraftChecklistItem[]) => {
    if (!items.some((item) => item.completed)) return null
    return (
      <button
        type="button"
        onClick={() => toggleShowCompleted(listId)}
        className="text-secondary font-medium text-on-surface-variant hover:text-on-surface"
      >
        {isShowingCompleted(listId) ? 'Hide closed items' : 'Show closed items'}
      </button>
    )
  }

  /* List title row: rename + count; section header when one list, or per-list when multiple */
  const renderListTitleRow = (
    cl: { id: string; title: string; items: DraftChecklistItem[] },
    options?: { showDelete?: boolean },
  ) => (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {editingChecklistId === cl.id ? (
        <Input
          className="border-outline-variant/30 flex-1 text-sm font-medium"
          value={editingChecklistTitle}
          onChange={(e) => setEditingChecklistTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSaveChecklistTitle(cl.id)
            }
            if (e.key === 'Escape') {
              e.stopPropagation()
              setEditingChecklistId(null)
            }
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingChecklistId(cl.id)
            setEditingChecklistTitle(cl.title)
          }}
          className="text-secondary font-medium text-on-surface flex-1 truncate text-left hover:text-primary transition-colors"
          title="Rename checklist"
        >
          {cl.title}
        </button>
      )}
      <span className="text-secondary text-on-surface-variant shrink-0">
        {cl.items.filter((i) => i.completed).length}/{cl.items.length}
      </span>
      {options?.showDelete ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editingChecklistId === cl.id) {
                handleSaveChecklistTitle(cl.id)
              } else {
                setEditingChecklistId(cl.id)
                setEditingChecklistTitle(cl.title)
              }
            }}
          >
            {editingChecklistId === cl.id ? 'Save' : 'Rename'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteChecklist(cl.id)}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-3 mt-6">
      {/* Section header: label or single-list title; create-list on the right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <MaterialIcon name="checklist" className="text-base shrink-0 text-outline" />
          {singleList ? (
            renderListTitleRow(singleList)
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-outline">
              Checklist
            </span>
          )}
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={handleCreateNewList}
            disabled={loading}
            className="shrink-0 text-secondary font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            Create new list
          </button>
        ) : null}
      </div>

      {!canEdit ? (
        <p className="text-secondary text-on-surface-variant">{disabledMessage}</p>
      ) : (
        <>
          {/* Checklist items: shown above the add row */}
          {loading && lists.length === 0 ? (
            <p className="text-secondary text-on-surface-variant">Loading checklists...</p>
          ) : lists.length === 0 ? (
            <p className="text-secondary text-on-surface-variant">
              {props.mode === 'draft'
                ? 'Items you add here will be saved when you save the task.'
                : 'No checklist items yet.'}
            </p>
          ) : (
            <div className="space-y-6">
              {lists.map((cl) => (
                <div key={cl.id} className="space-y-2">
                  {/* List header: only when multiple lists */}
                  {showListHeaders ? (
                    <div className="flex items-center justify-between gap-2">
                      {renderListTitleRow(cl, { showDelete: true })}
                    </div>
                  ) : null}

                  {/* Item rows */}
                  {cl.items.length > 0 ? (
                    <ul className="space-y-0.5">
                      {cl.items
                        .filter((item) =>
                          isShowingCompleted(cl.id) ? true : !item.completed,
                        )
                        .map((item) => (
                          <ChecklistItemRow
                            key={item.id}
                            title={item.title}
                            completed={item.completed}
                            onToggle={(completed) =>
                              handleToggleItem(cl.id, item.id, completed)
                            }
                            isEditing={editingItemId === item.id}
                            editingTitle={editingItemTitle}
                            onEditingTitleChange={setEditingItemTitle}
                            onSaveEdit={() => handleSaveItemTitle(cl.id, item.id)}
                            onCancelEdit={() => setEditingItemId(null)}
                            onStartEdit={() => {
                              setEditingItemId(item.id)
                              setEditingItemTitle(item.title)
                            }}
                            onDelete={() => handleDeleteItem(cl.id, item.id)}
                          />
                        ))}
                    </ul>
                  ) : null}

                  {renderPastePrompt(cl.id)}
                  {renderAddItemRow(cl.id)}
                  {renderHideClosedToggle(cl.id, cl.items)}
                </div>
              ))}
            </div>
          )}

          {/* Add row when no checklist exists yet */}
          {lists.length === 0 ? (
            <>
              {renderPastePrompt(null)}
              {renderAddItemRow(null)}
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
