/* ReminderItem: Single row with checkbox, name, and remind date; click opens edit; date click opens date picker popover */

import { useRef, useState } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { InlineTitleInput } from '../../components/InlineTitleInput'
import { Tooltip } from '../../components/Tooltip'
import { RepeatIcon } from '../../components/icons'
import { SingleDatePickerModal } from './modals/SingleDatePickerModal'
import { parseRecurrencePattern, formatRecurrenceForTooltip } from '../../lib/recurrence'
import { isOverdue } from '../tasks/utils/date'
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

  /* Check if reminder due date is overdue: use remind_at field */
  const isRemindOverdue = Boolean(reminder.remind_at && isOverdue(reminder.remind_at))

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
      {/* Remind date: clickable when onUpdateReminder provided; shows repeat icon + tooltip when recurring */}
      {onUpdateReminder ? (
        <>
          {reminder.recurrence_pattern ? (
            <Tooltip
              content={
                <span className="text-secondary text-bonsai-slate-800">
                  {formatRecurrenceForTooltip(parseRecurrencePattern(reminder.recurrence_pattern))}
                </span>
              }
              position="top"
              size="sm"
            >
              <button
                ref={dateButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDatePickerOpen(true)
                }}
                className={`flex items-center gap-1 text-secondary shrink-0 ml-2 hover:underline transition-colors rounded px-1 -mx-1 ${isRemindOverdue ? 'text-red-600 font-medium hover:text-red-700' : 'text-bonsai-slate-500 hover:text-bonsai-slate-700'}`}
                aria-label={reminder.remind_at ? 'Edit reminder date' : 'Set reminder date'}
              >
                <RepeatIcon className="w-4 h-4 shrink-0" aria-hidden />
                {formatRemindDate(reminder.remind_at)}
              </button>
            </Tooltip>
          ) : (
            <button
              ref={dateButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsDatePickerOpen(true)
              }}
              className={`flex items-center gap-1 text-secondary shrink-0 ml-2 hover:underline transition-colors rounded px-1 -mx-1 ${isRemindOverdue ? 'text-red-600 font-medium hover:text-red-700' : 'text-bonsai-slate-500 hover:text-bonsai-slate-700'}`}
              aria-label={reminder.remind_at ? 'Edit reminder date' : 'Set reminder date'}
            >
              {formatRemindDate(reminder.remind_at)}
            </button>
          )}
          <SingleDatePickerModal
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            value={reminder.remind_at}
            onSave={async (iso, recurrencePattern) => {
              await onUpdateReminder(reminder.id, { remind_at: iso, recurrence_pattern: recurrencePattern ?? null })
            }}
            triggerRef={dateButtonRef}
            recurrencePattern={reminder.recurrence_pattern}
          />
        </>
      ) : (
        <span className={`flex items-center gap-1 text-secondary shrink-0 ml-2 ${isRemindOverdue ? 'text-red-600 font-medium' : 'text-bonsai-slate-500'}`}>
          {reminder.recurrence_pattern ? (
            <RepeatIcon className="w-4 h-4 shrink-0" aria-hidden />
          ) : null}
          {formatRemindDate(reminder.remind_at)}
        </span>
      )}
    </div>
  )
}
