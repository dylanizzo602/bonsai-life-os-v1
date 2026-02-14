/* AddEditReminderModal: Modal for adding/editing a reminder; name, single date+time, recurring placeholder */

import { useState, useEffect, useRef } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { SingleDatePickerModal } from './modals/SingleDatePickerModal'
import type { Reminder, CreateReminderInput, UpdateReminderInput } from './types'

export interface AddEditReminderModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when user submits new reminder */
  onCreateReminder?: (input: CreateReminderInput) => Promise<Reminder>
  /** Called when user saves edits */
  onUpdateReminder?: (id: string, input: UpdateReminderInput) => Promise<Reminder>
  /** Existing reminder when editing; when set, modal is in edit mode */
  reminder?: Reminder | null
  /** Called after create or update so parent can refetch the list */
  onRemindersChanged?: () => void | Promise<void>
}

/** Format remind_at for display on the date/time button */
function formatRemindAtDisplay(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!iso.includes('T')) return dateStr
  const hour12 = d.getHours() % 12 || 12
  const min = d.getMinutes()
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  return `${dateStr}, ${hour12}:${String(min).padStart(2, '0')} ${ampm}`
}

/** Calendar icon for date/time button */
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

/**
 * Add/Edit Reminder modal.
 * Name input, single date+time picker, recurring section (placeholder only). Submit creates or updates.
 */
export function AddEditReminderModal({
  isOpen,
  onClose,
  onCreateReminder,
  onUpdateReminder,
  reminder = null,
  onRemindersChanged: _onRemindersChanged,
}: AddEditReminderModalProps) {
  const [name, setName] = useState('')
  const [remind_at, setRemindAt] = useState<string | null>(null)
  const [recurrence_pattern, setRecurrencePattern] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const datePickerButtonRef = useRef<HTMLButtonElement>(null)

  const isEditMode = !!reminder

  /* Sync form state when modal opens or reminder (edit) changes */
  useEffect(() => {
    if (isOpen) {
      if (reminder) {
        setName(reminder.name)
        setRemindAt(reminder.remind_at)
        setRecurrencePattern(reminder.recurrence_pattern ?? null)
      } else {
        setName('')
        setRemindAt(null)
        setRecurrencePattern(null)
      }
    }
  }, [isOpen, reminder])

  /* Submit: create or update reminder */
  const handleSubmit = async () => {
    if (!name.trim()) return
    if (isEditMode && onUpdateReminder) {
      try {
        setSubmitting(true)
        await onUpdateReminder(reminder.id, { name: name.trim(), remind_at, recurrence_pattern: recurrence_pattern ?? null })
        /* State is updated optimistically by useReminders hook */
        onClose()
      } catch {
        // Error handled by parent / useReminders
      } finally {
        setSubmitting(false)
      }
    } else if (!isEditMode && onCreateReminder) {
      try {
        setSubmitting(true)
        await onCreateReminder({ name: name.trim(), remind_at, recurrence_pattern: recurrence_pattern ?? null })
        /* State is updated optimistically by useReminders hook */
        onClose()
      } catch {
        // Error handled by parent
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? 'Edit reminder' : 'New reminder'}
        fullScreenOnMobile
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
            >
              {submitting ? (isEditMode ? 'Saving...' : 'Adding...') : 'Remind Me'}
            </Button>
          </>
        }
      >
        {/* Reminder name input */}
        <div className="mb-4">
          <Input
            placeholder="What do you need to be reminded?"
            className="border-bonsai-slate-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Reminder name"
          />
        </div>

        {/* Set reminder date & time: opens SingleDatePickerModal; pill style to match Add start/due date in task modal */}
        <div className="mb-4">
          <button
            ref={datePickerButtonRef}
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
          >
            <CalendarIcon className="w-4 h-4 text-bonsai-slate-500 shrink-0" />
            <span>
              {remind_at ? formatRemindAtDisplay(remind_at) : 'Set reminder date & time'}
            </span>
          </button>
        </div>
      </Modal>

      <SingleDatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        value={remind_at}
        onSave={(iso, rec) => {
          setRemindAt(iso)
          setRecurrencePattern(rec ?? null)
          setDatePickerOpen(false)
        }}
        triggerRef={datePickerButtonRef}
        recurrencePattern={recurrence_pattern}
      />
    </>
  )
}
