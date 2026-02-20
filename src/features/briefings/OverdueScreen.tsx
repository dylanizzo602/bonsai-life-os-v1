/* OverdueScreen: Show overdue tasks and reminders from yesterday; allow update/complete; same breakpoints as Task section */

import { Button } from '../../components/Button'
import { CompactTaskItem } from '../tasks/CompactTaskItem'
import { ReminderItem } from '../reminders/ReminderItem'
import type { Task } from '../tasks/types'
import type { Reminder } from '../reminders/types'

interface OverdueScreenProps {
  /** Overdue tasks (due_date before today, not completed) */
  overdueTasks: Task[]
  /** Overdue reminders (remind_at before today, not completed) */
  overdueReminders: Reminder[]
  loading: boolean
  /** When user clicks a task, open edit modal */
  onEditTask: (task: Task) => void
  /** When user clicks a reminder, open edit modal */
  onEditReminder: (reminder: Reminder) => void
  /** Update reminder (e.g. after date change) */
  onUpdateReminder: (id: string, input: { name?: string; remind_at?: string | null; completed?: boolean }) => Promise<Reminder>
  /** Toggle reminder complete */
  onToggleReminderComplete: (id: string, completed: boolean) => void
  /** Go to next step */
  onNext: () => void
}

/**
 * Overdue / catch-up step: list overdue tasks and reminders; "Way to go" if none.
 * Uses same breakpoint behavior as Task section: lg = full-width rows, below = compact.
 * Here we use CompactTaskItem for all breakpoints for simplicity; ReminderItem for reminders.
 */
export function OverdueScreen({
  overdueTasks,
  overdueReminders,
  loading,
  onEditTask,
  onEditReminder,
  onUpdateReminder,
  onToggleReminderComplete,
  onNext,
}: OverdueScreenProps) {
  /* Combined list: tasks first, then reminders (same order as TaskList) */
  const hasAny = overdueTasks.length > 0 || overdueReminders.length > 0

  return (
    <div className="flex flex-col">
      {loading ? (
        <p className="text-body text-bonsai-slate-500">Loading...</p>
      ) : !hasAny ? (
        <>
          <p className="text-body font-medium text-bonsai-brown-700 mb-2">
            Way to go — you're all caught up.
          </p>
          <p className="text-secondary text-bonsai-slate-600 mb-6">
            No overdue tasks or reminders from yesterday.
          </p>
        </>
      ) : (
        <>
          <p className="text-body font-medium text-bonsai-slate-700 mb-4">
            Here are overdue items from yesterday. Clear or update them, then continue.
          </p>
          {/* Tasks: compact layout on all breakpoints to match Task section density */}
          <div className="space-y-2 mb-4">
            {overdueTasks.map((task) => (
              <CompactTaskItem
                key={task.id}
                task={task}
                onClick={() => onEditTask(task)}
                isBlocked={false}
                isBlocking={false}
              />
            ))}
          </div>
          {/* Reminders */}
          <div className="space-y-2 mb-4">
            {overdueReminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                onToggleComplete={onToggleReminderComplete}
                onEdit={onEditReminder}
                onUpdateReminder={onUpdateReminder}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        <Button type="button" onClick={onNext} variant="primary" className="w-full">
          Next
        </Button>
      </div>
    </div>
  )
}
