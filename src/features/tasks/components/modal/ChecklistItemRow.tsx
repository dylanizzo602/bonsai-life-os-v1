/* ChecklistItemRow: Single checklist item row for modal breakdown sections */

import { Input } from '../../../../components/Input'
import { Checkbox } from '../../../../components/Checkbox'
import { Button } from '../../../../components/Button'

export interface ChecklistItemRowProps {
  /** Item display title */
  title: string
  /** Whether the item is completed */
  completed: boolean
  /** Called when checkbox toggled */
  onToggle: (completed: boolean) => void
  /** Inline edit mode */
  isEditing?: boolean
  /** Current edit value when isEditing */
  editingTitle?: string
  /** Update edit value */
  onEditingTitleChange?: (value: string) => void
  /** Save inline edit */
  onSaveEdit?: () => void
  /** Cancel inline edit */
  onCancelEdit?: () => void
  /** Start inline edit (e.g. double-click title) */
  onStartEdit?: () => void
  /** Delete this item */
  onDelete?: () => void
}

/**
 * Compact checklist item row matching modal design tokens.
 * Checkbox + title with optional inline rename and delete on hover.
 */
export function ChecklistItemRow({
  title,
  completed,
  onToggle,
  isEditing = false,
  editingTitle = '',
  onEditingTitleChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
}: ChecklistItemRowProps) {
  return (
    <li className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-variant/10">
      <Checkbox checked={completed} onChange={(e) => onToggle(e.target.checked)} />
      {isEditing ? (
        <Input
          className="border-outline-variant/30 flex-1 text-sm"
          value={editingTitle}
          onChange={(e) => onEditingTitleChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSaveEdit?.()
            }
            if (e.key === 'Escape') {
              e.stopPropagation()
              onCancelEdit?.()
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 text-sm cursor-text ${
            completed
              ? 'text-on-surface-variant line-through'
              : 'text-on-surface'
          }`}
          onDoubleClick={() => onStartEdit?.()}
        >
          {title}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {isEditing ? (
          <Button type="button" variant="ghost" size="sm" onClick={onSaveEdit}>
            Save
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onStartEdit}>
            Rename
          </Button>
        )}
        {onDelete ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </div>
    </li>
  )
}
