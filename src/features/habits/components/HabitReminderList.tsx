/* HabitReminderList: Styled reminder rows with add/delete for habit modal */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { formatReminderTimeDisplay } from '../utils/habitReminders'

export interface HabitReminderListProps {
  reminderTimes: string[]
  onAdd: () => void
  onRemove: (index: number) => void
}

/**
 * List of reminder times with add/delete controls.
 */
export function HabitReminderList({ reminderTimes, onAdd, onRemove }: HabitReminderListProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="block text-secondary font-bold uppercase tracking-widest text-outline">
          Reminders
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 text-secondary font-bold text-primary hover:underline"
        >
          <MaterialIcon name="add" className="text-base" />
          Add Reminder
        </button>
      </div>

      {reminderTimes.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No reminders set.</p>
      ) : (
        <div className="space-y-3">
          {reminderTimes.map((time, index) => (
            <div
              key={`${time}-${index}`}
              className="group flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-4 transition-colors hover:border-outline"
            >
              <div className="flex items-center gap-4">
                <MaterialIcon name="notifications" className="text-primary" />
                <span className="text-body font-semibold text-on-surface">
                  {formatReminderTimeDisplay(time)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-outline-variant opacity-0 transition-all hover:text-error group-hover:opacity-100"
                aria-label="Remove reminder"
              >
                <MaterialIcon name="delete" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
