/* Reminders page: Section header, Add reminder button, list, and Add/Edit modal */

import { useState } from 'react'
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
      {/* Section header: Title and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Reminders</h1>
        <AddButton
          className="self-end sm:self-auto"
          aria-label="Add reminder"
          onClick={openAdd}
        >
          Add reminder
        </AddButton>
      </div>

      {/* Reminder list: checkbox, name, date; click opens edit modal */}
      <div className="w-full min-h-[60vh]">
        <ReminderList
          reminders={reminders}
          loading={loading}
          error={error}
          onToggleComplete={toggleComplete}
          onEdit={openEdit}
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
