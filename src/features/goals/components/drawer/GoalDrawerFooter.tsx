/* GoalDrawerFooter: sticky delete action */
import { useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'

interface GoalDrawerFooterProps {
  onDelete: () => Promise<void>
}

/**
 * Sticky footer with delete goal (confirm on second tap).
 */
export function GoalDrawerFooter({ onDelete }: GoalDrawerFooterProps) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true)
      return
    }
    try {
      setDeleting(true)
      await onDelete()
    } finally {
      setDeleting(false)
      setConfirm(false)
    }
  }

  return (
    <div className="sticky bottom-0 border-t border-surface-container-high bg-surface-container-lowest p-6">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-error-container px-4 py-3 font-semibold text-on-error-container transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <MaterialIcon name="delete" className="text-[20px]" />
        {deleting ? 'Deleting…' : confirm ? 'Confirm delete' : 'Delete Goal'}
      </button>
    </div>
  )
}
