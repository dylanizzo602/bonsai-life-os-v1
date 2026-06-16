/* UnresolvedItemsConfirmModal: Shown when completing a task that has open subtasks or checklist items */

import { Modal } from '../../../components/Modal'
import { MaterialIcon } from '../../../components/MaterialIcon'

export interface UnresolvedItemsConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close modal and cancel completing the task (e.g. backdrop click or Escape) */
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

/** Build the summary sentence for unresolved subtasks and checklist items */
function buildUnresolvedMessage(
  unresolvedSubtaskCount: number,
  unresolvedChecklistItemCount: number,
): string {
  const parts: string[] = []

  if (unresolvedSubtaskCount > 0) {
    parts.push(
      `${unresolvedSubtaskCount} subtask${unresolvedSubtaskCount === 1 ? '' : 's'}`,
    )
  }

  if (unresolvedChecklistItemCount > 0) {
    parts.push(
      `${unresolvedChecklistItemCount} checklist item${unresolvedChecklistItemCount === 1 ? '' : 's'}`,
    )
  }

  if (parts.length === 0) return ''

  const itemList =
    parts.length === 2 ? `${parts[0]} and ${parts[1]}` : parts[0]

  return `There are still ${itemList} that haven't been completed. How would you like to proceed?`
}

/**
 * Modal shown when the user tries to complete a task that has unresolved subtasks or checklist items.
 * Offers: keep items open and finish the task, or complete all items and finish the task.
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
  if (!isOpen || total === 0) return null

  const message = buildUnresolvedMessage(unresolvedSubtaskCount, unresolvedChecklistItemCount)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="backdrop-blur-md bg-surface/70"
      cardClassName="bg-surface-container-lowest w-full max-w-[480px] rounded-xl custom-shadow overflow-hidden flex flex-col border border-outline-variant/20"
      bodyClassName="!p-0"
    >
      {/* Header: Icon, title, and summary message */}
      <div className="flex flex-col items-center px-6 pb-4 pt-8 text-center md:px-8">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed">
          <MaterialIcon name="feedback" className="text-4xl text-primary" />
        </div>
        <h2 className="text-body mb-2 font-semibold tracking-tight text-on-surface">
          Unresolved items remaining
        </h2>
        <p className="text-secondary px-2 text-on-surface-variant">{message}</p>
      </div>

      {/* Preview: Open subtask and checklist counts */}
      <div className="px-6 py-6 md:px-8">
        <div className="space-y-3 rounded-lg bg-surface-container p-4">
          {unresolvedSubtaskCount > 0 && (
            <div className="flex items-center justify-between text-secondary">
              <div className="flex items-center space-x-2">
                <MaterialIcon
                  name="subdirectory_arrow_right"
                  className="text-[18px] text-primary"
                />
                <span className="font-medium text-on-surface-variant">Subtasks</span>
              </div>
              <span className="font-bold text-primary">
                {unresolvedSubtaskCount} Open
              </span>
            </div>
          )}
          {unresolvedChecklistItemCount > 0 && (
            <div className="flex items-center justify-between text-secondary">
              <div className="flex items-center space-x-2">
                <MaterialIcon name="checklist" className="text-[18px] text-primary" />
                <span className="font-medium text-on-surface-variant">Checklist items</span>
              </div>
              <span className="font-bold text-primary">
                {unresolvedChecklistItemCount} Open
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions: Complete all items or keep items open */}
      <div className="flex flex-col space-y-3 px-6 pb-8 pt-2 md:px-8">
        <button
          type="button"
          onClick={() => void onCompleteAndResolveAll()}
          className="custom-shadow w-full rounded-lg bg-primary py-4 font-semibold text-on-primary transition-all hover:bg-bonsai-sage-700 active:scale-[0.98]"
        >
          Complete All &amp; Finish
        </button>
        <button
          type="button"
          onClick={() => void onCompleteWithoutResolving()}
          className="w-full rounded-lg border border-transparent bg-transparent py-3 font-medium text-secondary transition-all hover:border-outline-variant/20 hover:bg-surface-container-high"
        >
          Keep Open &amp; Finish
        </button>
      </div>

      {/* Decoration: Bottom accent bar */}
      <div className="h-1.5 w-full overflow-hidden bg-primary-fixed">
        <div className="h-full w-2/3 bg-primary" />
      </div>
    </Modal>
  )
}
