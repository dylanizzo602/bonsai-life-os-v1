/* Reminders page: Section header, visibility toggles, Add reminder button, list, and Add/Edit modal */

import { useMemo, useState } from 'react'
import { AddButton } from '../../components/AddButton'
import { ReminderList } from './ReminderList'
import { AddEditReminderModal } from './AddEditReminderModal'
import { useReminders } from './hooks/useReminders'
import type { Reminder } from './types'

/**
 * Reminders page component.
 * Title, Add reminder button, list of reminders (checkbox, name, date), and add/edit modal.
 */
export function RemindersPage() {
  const {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    toggleComplete,
  } = useReminders()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)

  /* Visibility toggles: closed (completed) and deleted are hidden by default */
  const [showClosed, setShowClosed] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (r.completed && !showClosed) return false
      if ((r.deleted ?? false) && !showDeleted) return false
      return true
    })
  }, [reminders, showClosed, showDeleted])

  const openAdd = () => {
    setEditReminder(null)
    setIsModalOpen(true)
  }

  const openEdit = (reminder: Reminder) => {
    setEditReminder(reminder)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditReminder(null)
  }

  return (
    <div className="min-h-full">
      {/* Section header: Title, visibility toggles, add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Reminders</h1>
        <div className="flex flex-wrap items-center gap-2 justify-end sm:justify-start">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className={`rounded px-3 py-1.5 text-secondary font-medium transition-colors ${showClosed ? 'bg-bonsai-sage-200 text-bonsai-sage-800' : 'bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200'}`}
            aria-pressed={showClosed}
          >
            Show closed
          </button>
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className={`rounded px-3 py-1.5 text-secondary font-medium transition-colors ${showDeleted ? 'bg-bonsai-sage-200 text-bonsai-sage-800' : 'bg-bonsai-slate-100 text-bonsai-slate-600 hover:bg-bonsai-slate-200'}`}
            aria-pressed={showDeleted}
          >
            Show deleted
          </button>
          <AddButton
            className="self-end sm:self-auto"
            aria-label="Add reminder"
            onClick={openAdd}
          >
            Add reminder
          </AddButton>
        </div>
      </div>

      {/* Reminder list: checkbox, name, date; click opens edit modal */}
      <div className="w-full min-h-[60vh]">
        <ReminderList
          reminders={filteredReminders}
          loading={loading}
          error={error}
          onToggleComplete={toggleComplete}
          onEdit={openEdit}
          onUpdateReminder={updateReminder}
        />
      </div>

      {/* Add/Edit Reminder modal */}
      <AddEditReminderModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onCreateReminder={createReminder}
        onUpdateReminder={updateReminder}
        reminder={editReminder}
      />
    </div>
  )
}
