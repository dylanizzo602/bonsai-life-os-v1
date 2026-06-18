/* ModalSubtaskAddField: Add new subtask or link an existing task using shared task search */

import { useState, useCallback } from 'react'
import { TaskSearchSelect, type TaskOption } from '../../../../components/TaskSearchSelect'
import {
  MODAL_TASK_SEARCH_DROPDOWN_CLASS,
  MODAL_TASK_SEARCH_INPUT_CLASS,
  MODAL_TASK_SEARCH_OPTION_CLASS,
} from './modalTaskSearchStyles'

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
 * Subtask add + link controls for the task edit modal.
 * Create uses a title field; linking reuses the shared TaskSearchSelect picker.
 */
export function ModalSubtaskAddField({
  taskId,
  getTasksForLinking,
  onCreateSubtask,
  onLinkExistingTask,
  excludeTaskIds = [],
  disabled = false,
}: ModalSubtaskAddFieldProps) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addFieldClassName =
    'flex-1 bg-surface-variant/10 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none'
  const addButtonClassName =
    'px-6 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0'

  /* Create subtask: persist title from the add field */
  const handleCreate = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onCreateSubtask(trimmed)
      setTitle('')
    } catch (err) {
      console.error('Error creating subtask:', err)
    } finally {
      setSubmitting(false)
    }
  }, [onCreateSubtask, submitting, title])

  /* Link existing task: delegate to shared search picker */
  const handleLinkExistingTask = useCallback(
    async (task: TaskOption) => {
      setSubmitting(true)
      try {
        await onLinkExistingTask(task)
      } catch (err) {
        console.error('Error linking task as subtask:', err)
      } finally {
        setSubmitting(false)
      }
    },
    [onLinkExistingTask],
  )

  return (
    <div className="space-y-3">
      {/* Create row: new subtask title + Add button */}
      <div className="flex gap-2">
        <input
          className={addFieldClassName}
          placeholder="Add a new subtask"
          type="text"
          value={title}
          disabled={disabled || submitting}
          aria-label="New subtask title"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleCreate()
            }
          }}
        />
        <button
          type="button"
          className={addButtonClassName}
          onClick={() => void handleCreate()}
          disabled={disabled || submitting || !title.trim()}
        >
          Add
        </button>
      </div>

      {/* Link row: shared task search with top match suggestions */}
      <TaskSearchSelect
        getTasks={getTasksForLinking}
        onSelectTask={handleLinkExistingTask}
        excludeTaskIds={[taskId, ...excludeTaskIds]}
        placeholder="Search to link an existing task..."
        disabled={disabled || submitting}
        aria-label="Search and link existing task as subtask"
        inputClassName={MODAL_TASK_SEARCH_INPUT_CLASS}
        dropdownClassName={MODAL_TASK_SEARCH_DROPDOWN_CLASS}
        optionClassName={MODAL_TASK_SEARCH_OPTION_CLASS}
      />
    </div>
  )
}
