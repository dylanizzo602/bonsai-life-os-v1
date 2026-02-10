/* DatePickerModal: Temporary start/due date and optional due time picker */

import { useState, useEffect } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'

export interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  startDate: string | null
  dueDate: string | null
  onSave: (start: string | null, due: string | null) => void
}

/** Parse ISO string to date input value (YYYY-MM-DD) */
function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

/** Parse ISO string to time input value (HH:mm) */
function toTimeInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const hours = d.getHours()
  const mins = d.getMinutes()
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** Build ISO string from date (YYYY-MM-DD) and optional time (HH:mm) */
function toISO(dateStr: string, timeStr?: string): string | null {
  if (!dateStr) return null
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`).toISOString()
  }
  return new Date(dateStr + 'T12:00:00').toISOString()
}

export function DatePickerModal({
  isOpen,
  onClose,
  startDate,
  dueDate,
  onSave,
}: DatePickerModalProps) {
  const [start, setStart] = useState('')
  const [due, setDue] = useState('')
  const [dueTime, setDueTime] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStart(toDateInputValue(startDate))
      setDue(toDateInputValue(dueDate))
      setDueTime(toTimeInputValue(dueDate))
    }
  }, [isOpen, startDate, dueDate])

  const handleSave = () => {
    const startISO = toISO(start)
    const dueISO = due ? toISO(due, dueTime || undefined) : null
    onSave(startISO, dueISO)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start / due date"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
            Start date
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-lg border border-bonsai-slate-300 px-3 py-2 text-sm text-bonsai-slate-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
            Due date
          </label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full rounded-lg border border-bonsai-slate-300 px-3 py-2 text-sm text-bonsai-slate-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
            Due time (optional)
          </label>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full rounded-lg border border-bonsai-slate-300 px-3 py-2 text-sm text-bonsai-slate-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
          />
        </div>
      </div>
    </Modal>
  )
}
