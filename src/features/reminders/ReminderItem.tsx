/* ReminderItem: Single row with checkbox, name, and remind date; click opens edit; date click opens date picker popover */

import { useRef, useState } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { InlineTitleInput } from '../../components/InlineTitleInput'
import { SingleDatePickerModal } from './modals/SingleDatePickerModal'
import type { Reminder, UpdateReminderInput } from './types'

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
  /** Optional right-click context menu (e.g. show reminder options popover) */
  onContextMenu?: (e: React.MouseEvent) => void
  /** When set, show inline text input to edit reminder name (Rename from context menu) */
  inlineEditName?: {
    value: string
    onSave: (newName: string) => void | Promise<void>
    onCancel: () => void
  }
  /** Update reminder (e.g. for date picker popover); when provided, reminder date is clickable and opens single-date popover */
  onUpdateReminder?: (id: string, input: UpdateReminderInput) => Promise<Reminder>
}

/**
 * Single reminder row: checkbox, name, remind date. Clicking row opens edit modal; clicking date opens date picker popover when onUpdateReminder is provided.
 */
export function ReminderItem({
  reminder,
  onToggleComplete,
  onEdit,
  onContextMenu,
  inlineEditName,
  onUpdateReminder,
}: ReminderItemProps) {
  /* Date picker popover: open state and trigger ref for positioning */
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const dateButtonRef = useRef<HTMLButtonElement>(null)

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onToggleComplete(reminder.id, e.target.checked)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !inlineEditName && onEdit(reminder)}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (!inlineEditName && (e.key === 'Enter' || e.key === ' ')) {
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
      {/* Reminder name: takes remaining space; or inline edit input when renaming */}
      <div className="flex-1 min-w-0" onClick={(e) => inlineEditName && e.stopPropagation()}>
        {inlineEditName ? (
          <InlineTitleInput
            value={inlineEditName.value}
            onSave={inlineEditName.onSave}
            onCancel={inlineEditName.onCancel}
            className="w-full text-body text-bonsai-brown-700 border border-bonsai-sage-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
          />
        ) : (
          <span
            className={`text-body text-bonsai-brown-700 ${reminder.completed ? 'line-through text-bonsai-slate-500' : ''}`}
          >
            {reminder.name}
          </span>
        )}
      </div>
      {/* Remind date: clickable when onUpdateReminder provided; opens single-date picker popover */}
      {onUpdateReminder ? (
        <button
          ref={dateButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsDatePickerOpen(true)
          }}
          className="text-secondary text-bonsai-slate-500 shrink-0 ml-2 hover:text-bonsai-slate-700 hover:underline transition-colors rounded px-1 -mx-1"
          aria-label={reminder.remind_at ? 'Edit reminder date' : 'Set reminder date'}
        >
          {formatRemindDate(reminder.remind_at)}
        </button>
      ) : (
        <span className="text-secondary text-bonsai-slate-500 shrink-0 ml-2">
          {formatRemindDate(reminder.remind_at)}
        </span>
      )}
      {/* Single-date picker popover: edit reminder date without opening full edit modal */}
      {onUpdateReminder && (
        <SingleDatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          value={reminder.remind_at}
          onSave={async (iso) => {
            await onUpdateReminder(reminder.id, { remind_at: iso })
          }}
          triggerRef={dateButtonRef}
        />
      )}
    </div>
  )
}
