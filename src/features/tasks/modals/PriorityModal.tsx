/* PriorityModal: Set task priority (None, Low, Normal, High, Urgent) */

import { Modal } from '../../../components/Modal'
import type { TaskPriority } from '../types'

export interface PriorityModalProps {
  isOpen: boolean
  onClose: () => void
  value: TaskPriority
  onSelect: (p: TaskPriority) => void | Promise<void>
}

const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function PriorityModal({ isOpen, onClose, value, onSelect }: PriorityModalProps) {
  const handleSelect = async (p: TaskPriority) => {
    const result = onSelect(p)
    /* If onSelect returns a promise, wait for it before closing */
    if (result instanceof Promise) {
      try {
        await result
        onClose()
      } catch (error) {
        /* Keep modal open on error so user can try again */
        console.error('Error in onSelect callback:', error)
      }
    } else {
      /* Synchronous callback, close immediately */
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set priority">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-bonsai-sage-600 text-white'
                : 'bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Modal>
  )
}
