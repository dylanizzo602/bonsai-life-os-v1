/* ReminderList: Renders list of reminders with checkbox, name, date; click to edit */

import { ReminderItem } from './ReminderItem'
import type { Reminder } from './types'

export interface ReminderListProps {
  /** List of reminders */
  reminders: Reminder[]
  /** Whether list is loading */
  loading?: boolean
  /** Error message if fetch failed */
  error?: string | null
  /** Toggle reminder completion */
  onToggleComplete: (id: string, completed: boolean) => void
  /** Open edit modal for a reminder */
  onEdit: (reminder: Reminder) => void
}

/**
 * List of reminder rows. Shows loading or error state when applicable.
 */
export function ReminderList({
  reminders,
  loading = false,
  error = null,
  onToggleComplete,
  onEdit,
}: ReminderListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-secondary text-bonsai-slate-600">
        Loading reminders…
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-body text-red-600">
        {error}
      </div>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="py-8 text-center text-secondary text-bonsai-slate-600">
        No reminders yet. Add one to get started.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {reminders.map((reminder) => (
        <ReminderItem
          key={reminder.id}
          reminder={reminder}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
