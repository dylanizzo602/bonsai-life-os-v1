/* UnresolvedItemsConfirmModal: Shown when completing a task that has open subtasks or checklist items */

import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'

export interface UnresolvedItemsConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close modal and cancel completing the task (e.g. X or exit) */
  onClose: () => void
  /** Number of subtasks that are not complete */
  unresolvedSubtaskCount: number
  /** Number of checklist items that are not complete */
  unresolvedChecklistItemCount: number
  /** Complete the task only; leave subtasks and checklist items as-is */
  onCompleteWithoutResolving: () => void | Promise<void>
  /** Complete the task and mark all subtasks and checklist items complete */
  onCompleteAndResolveAll: () => void | Promise<void>
}

/**
 * Modal shown when the user tries to complete a task that has unresolved subtasks or checklist items.
 * Offers: exit (cancel), complete task and keep items open, or complete task and resolve all items.
 */
export function UnresolvedItemsConfirmModal({
  isOpen,
  onClose,
  unresolvedSubtaskCount,
  unresolvedChecklistItemCount,
  onCompleteWithoutResolving,
  onCompleteAndResolveAll,
}: UnresolvedItemsConfirmModalProps) {
  const total = unresolvedSubtaskCount + unresolvedChecklistItemCount
  if (total === 0) return null

  /* Breakdown lines: Only show subtasks or checklist items if count > 0 */
  const subtaskLine =
    unresolvedSubtaskCount > 0
      ? `${unresolvedSubtaskCount} subtask${unresolvedSubtaskCount === 1 ? '' : 's'}`
      : null
  const checklistLine =
    unresolvedChecklistItemCount > 0
      ? `${unresolvedChecklistItemCount} checklist item${unresolvedChecklistItemCount === 1 ? '' : 's'}`
      : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete task?"
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" onClick={onCompleteWithoutResolving}>
            Continue without resolving
          </Button>
          <Button variant="primary" onClick={onCompleteAndResolveAll}>
            Resolve items
          </Button>
        </div>
      }
    >
      {/* Message: Total unresolved count */}
      <p className="text-body text-bonsai-slate-700 mb-3">
        This task still has {total} unresolved item{total === 1 ? '' : 's'}.
      </p>
      {/* Breakdown: Subtasks and checklist items */}
      <ul className="list-disc list-inside text-secondary text-bonsai-slate-600 space-y-1">
        {subtaskLine && <li>{subtaskLine}</li>}
        {checklistLine && <li>{checklistLine}</li>}
      </ul>
    </Modal>
  )
}
