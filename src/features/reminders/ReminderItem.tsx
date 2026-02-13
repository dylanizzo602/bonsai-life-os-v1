/* ReminderItem: Single row with checkbox, name, and remind date; click opens edit */

import { Checkbox } from '../../components/Checkbox'
import type { Reminder } from './types'

/** Format remind_at for list display */
function formatRemindDate(iso: string | null): string {
  if (!iso) return 'No date'
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!iso.includes('T')) return dateStr
  const hour12 = d.getHours() % 12 || 12
  const min = d.getMinutes()
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  return `${dateStr}, ${hour12}:${String(min).padStart(2, '0')} ${ampm}`
}

export interface ReminderItemProps {
  /** Reminder data */
  reminder: Reminder
  /** Toggle completion (checkbox) */
  onToggleComplete: (id: string, completed: boolean) => void
  /** Open edit modal when row is clicked */
  onEdit: (reminder: Reminder) => void
}

/**
 * Single reminder row: checkbox, name, remind date. Clicking row opens edit modal.
 */
export function ReminderItem({ reminder, onToggleComplete, onEdit }: ReminderItemProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onToggleComplete(reminder.id, e.target.checked)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(reminder)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(reminder)
        }
      }}
      className="flex items-center gap-3 rounded-lg border border-bonsai-slate-200 bg-white p-3 md:p-4 hover:bg-bonsai-slate-50 transition-colors cursor-pointer text-left"
      aria-label={`Edit reminder: ${reminder.name}`}
    >
      {/* Checkbox: completed state; stop propagation so click doesn't open edit */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={reminder.completed}
          onChange={handleCheckboxChange}
          aria-label={reminder.completed ? 'Mark incomplete' : 'Mark complete'}
        />
      </div>
      {/* Reminder name: takes remaining space */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-body text-bonsai-brown-700 ${reminder.completed ? 'line-through text-bonsai-slate-500' : ''}`}
        >
          {reminder.name}
        </span>
      </div>
      {/* Remind date: aligned to the right of the item box */}
      <span className="text-secondary text-bonsai-slate-500 shrink-0 ml-2">
        {formatRemindDate(reminder.remind_at)}
      </span>
    </div>
  )
}
