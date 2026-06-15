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

  /* Add-item input and multi-line paste state */
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [pendingPasteLines, setPendingPasteLines] = useState<string[] | null>(null)

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
  const [showCompletedChecklistItems, setShowCompletedChecklistItems] = useState(true)

  const loading = props.mode === 'persisted' ? props.loading : false

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
  const hasAnyCompletedItems = lists.some((cl) => cl.items.some((i) => i.completed))

  /* Default title for a newly created checklist list */
  const nextDefaultListTitle = () => {
    const base = 'Checklist'
    const existing = new Set(lists.map((l) => l.title.toLowerCase()))
    if (!existing.has(base.toLowerCase())) return base
    let n = 2
    while (existing.has(`${base} ${n}`.toLowerCase())) n += 1
    return `${base} ${n}`
  }

  /* Add a checklist item in draft mode */
  const handleDraftAddItem = (rawTitle: string) => {
    if (props.mode !== 'draft') return
    const trimmed = rawTitle.trim()
    if (!trimmed) return
    props.onDraftChecklistsChange((prev) => {
      if (prev.length === 0) {
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
      return prev.map((cl, index) =>
        index === 0
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

  /* Top add row: create item in draft or persisted mode */
  const handleAddTopItem = () => {
    const next = newChecklistItem.trim()
    if (!next) return
    if (props.mode === 'draft') {
      handleDraftAddItem(next)
    } else {
      props.onAddItemOrCreateChecklist(next)
    }
    setNewChecklistItem('')
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

  /* Multi-line paste prompt for top add input */
  const renderTopPastePrompt = () => {
    if (!pendingPasteLines || pendingPasteLines.length <= 1) return null
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
                handleDraftAddItem(pendingPasteLines.join(' '))
              } else {
                props.onAddItemOrCreateChecklist(pendingPasteLines.join(' '))
              }
              setNewChecklistItem('')
              setPendingPasteLines(null)
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
                for (const line of pendingPasteLines) {
                  handleDraftAddItem(line)
                }
              } else {
                await props.onAddItemsOrCreateChecklist(pendingPasteLines)
              }
              setNewChecklistItem('')
              setPendingPasteLines(null)
            }}
            disabled={loading}
          >
            Create {pendingPasteLines.length} items
          </Button>
        </div>
      </div>
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
            <div className="space-y-3">
              {lists.map((cl) => (
                <div key={cl.id} className="space-y-1">
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
                          showCompletedChecklistItems ? true : !item.completed,
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
                </div>
              ))}
            </div>
          )}

          {renderTopPastePrompt()}

          {/* Add checklist item row */}
          <div className="flex gap-2">
            <input
              className={addFieldClassName}
              placeholder="Create a checklist item"
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text')
                const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                if (lines.length > 1) {
                  e.preventDefault()
                  setPendingPasteLines(lines)
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                handleAddTopItem()
              }}
              disabled={props.mode === 'persisted' ? loading : false}
            />
            <button
              type="button"
              className={addButtonClassName}
              onClick={handleAddTopItem}
              disabled={
                !newChecklistItem.trim() || (props.mode === 'persisted' ? loading : false)
              }
            >
              Add
            </button>
          </div>

          {/* Show/hide completed items: below add row */}
          {hasAnyCompletedItems ? (
            <button
              type="button"
              onClick={() => setShowCompletedChecklistItems((prev) => !prev)}
              className="text-secondary font-medium text-on-surface-variant hover:text-on-surface"
            >
              {showCompletedChecklistItems ? 'Hide closed items' : 'Show closed items'}
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
