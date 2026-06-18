/* ModalTaskRelationshipSearch: Linked task chips + shared TaskSearchSelect for modal relationship fields */

import type { ReactNode } from 'react'
import { TaskSearchSelect, type TaskOption } from '../../../../components/TaskSearchSelect'
import {
  MODAL_TASK_SEARCH_DROPDOWN_CLASS,
  MODAL_TASK_SEARCH_INPUT_CLASS,
  MODAL_TASK_SEARCH_OPTION_CLASS,
} from './modalTaskSearchStyles'

export interface ModalLinkedTaskItem {
  id: string
  title: string
  onRemove?: () => void
  onOpen?: () => void
}

export interface ModalTaskRelationshipSearchProps {
  /** Field label (icon + uppercase label row) */
  label: ReactNode
  /** Currently linked tasks shown above the search input */
  linkedItems?: ModalLinkedTaskItem[]
  /** Fetch tasks available for this relationship */
  getTasks: () => Promise<TaskOption[]>
  /** Called when the user picks a task from search results */
  onSelectTask: (task: TaskOption) => void | Promise<void>
  /** Task ids excluded from search (current task, already linked, etc.) */
  excludeTaskIds?: string[]
  placeholder: string
  disabled?: boolean
  'aria-label': string
}

/**
 * Modal relationship field: shows linked tasks (if any) and the shared task search picker.
 * Used for parent task, blocked by, blocking, and link-as-subtask flows.
 */
export function ModalTaskRelationshipSearch({
  label,
  linkedItems = [],
  getTasks,
  onSelectTask,
  excludeTaskIds = [],
  placeholder,
  disabled = false,
  'aria-label': ariaLabel,
}: ModalTaskRelationshipSearchProps) {
  return (
    <div className="space-y-2">
      {label}

      {/* Linked tasks: chip list with optional open/remove actions */}
      {linkedItems.length > 0 ? (
        <ul className="mb-2 space-y-1.5">
          {linkedItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-variant/10 px-3 py-2 text-sm"
            >
              <span className="truncate text-on-surface">{item.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                {item.onOpen ? (
                  <button
                    type="button"
                    onClick={item.onOpen}
                    className="text-secondary font-medium text-primary hover:underline"
                  >
                    Open
                  </button>
                ) : null}
                {item.onRemove ? (
                  <button
                    type="button"
                    onClick={item.onRemove}
                    className="text-secondary text-error hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Shared task search: type to filter, pick from top matches */}
      <TaskSearchSelect
        getTasks={getTasks}
        onSelectTask={onSelectTask}
        excludeTaskIds={excludeTaskIds}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        inputClassName={MODAL_TASK_SEARCH_INPUT_CLASS}
        dropdownClassName={MODAL_TASK_SEARCH_DROPDOWN_CLASS}
        optionClassName={MODAL_TASK_SEARCH_OPTION_CLASS}
      />
    </div>
  )
}
