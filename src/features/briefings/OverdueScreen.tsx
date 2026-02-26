/* OverdueScreen: Show overdue tasks, reminders, and habit reminders from before today; allow update/complete; same breakpoints as Task section */

import { Button } from '../../components/Button'
import { CompactTaskItem } from '../tasks/CompactTaskItem'
import { ReminderItem } from '../reminders/ReminderItem'
import { HabitReminderItem } from '../habits/HabitReminderItem'
import type { Task } from '../tasks/types'
import type { Reminder } from '../reminders/types'
import type { HabitWithStreaks } from '../habits/types'

interface OverdueHabitReminder {
  habit: HabitWithStreaks
  remindAt: string | null
}

interface OverdueScreenProps {
  /** Overdue tasks (due_date before today, not completed) */
  overdueTasks: Task[]
  /** Overdue reminders (remind_at before today, not completed) */
  overdueReminders: Reminder[]
  /** Overdue habit reminders (remindAt before today, not completed) */
  overdueHabitReminders?: OverdueHabitReminder[]
  loading: boolean
  /** When user clicks a task, open edit modal */
  onEditTask: (task: Task) => void
  /** When user clicks a reminder, open edit modal */
  onEditReminder: (reminder: Reminder) => void
  /** Update reminder (e.g. after date change) */
  onUpdateReminder: (id: string, input: { name?: string; remind_at?: string | null; completed?: boolean }) => Promise<Reminder>
  /** Toggle reminder complete */
  onToggleReminderComplete: (id: string, completed: boolean) => void
  /** Mark a habit reminder as complete for its occurrence */
  onHabitMarkComplete?: (habit: HabitWithStreaks, remindAt: string | null) => void
  /** Skip a habit reminder occurrence */
  onHabitSkip?: (habit: HabitWithStreaks, remindAt: string | null) => void
  /** Go to next step */
  onNext: () => void
}

/**
 * Overdue / catch-up step: list overdue tasks, reminders, and habit reminders; "Way to go" if none.
 * Uses same breakpoint behavior as Task section: lg = full-width rows, below = compact.
 * Here we use CompactTaskItem for tasks, ReminderItem for reminders, and HabitReminderItem for habit reminders.
 */
export function OverdueScreen({
  overdueTasks,
  overdueReminders,
  overdueHabitReminders,
  loading,
  onEditTask,
  onEditReminder,
  onUpdateReminder,
  onToggleReminderComplete,
  onHabitMarkComplete,
  onHabitSkip,
  onNext,
}: OverdueScreenProps) {
  /* Combined presence check: tasks, reminders, or habit reminders */
  const hasAny =
    overdueTasks.length > 0 ||
    overdueReminders.length > 0 ||
    (overdueHabitReminders?.length ?? 0) > 0

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
            No overdue tasks, reminders, or habit reminders from before today.
          </p>
        </>
      ) : (
        <>
          <p className="text-body font-medium text-bonsai-slate-700 mb-4">
            Here are overdue items from before today. Clear or update them, then continue.
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
          {/* Habit reminders */}
          {overdueHabitReminders && overdueHabitReminders.length > 0 && (
            <div className="space-y-2 mb-4">
              {overdueHabitReminders.map(({ habit, remindAt }) => (
                <HabitReminderItem
                  key={habit.id}
                  habit={habit}
                  remindAt={remindAt}
                  onMarkComplete={() => onHabitMarkComplete?.(habit, remindAt)}
                  onSkip={() => onHabitSkip?.(habit, remindAt)}
                />
              ))}
            </div>
          )}
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
