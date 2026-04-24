/* OverdueScreen: Overdue tasks and linked habit task rows */

import { CompactTaskItem } from '../tasks/CompactTaskItem'
import { HabitReminderItem } from '../habits/HabitReminderItem'
import { BriefingFooter } from './BriefingFooter'
import type { Task } from '../tasks/types'
import type { HabitWithStreaks } from '../habits/types'

interface OverdueHabitReminder {
  habit: HabitWithStreaks
  task: Task
  remindAt: string | null
}

interface OverdueScreenProps {
  overdueTasks: Task[]
  overdueHabitReminders?: OverdueHabitReminder[]
  loading: boolean
  onEditTask: (task: Task) => void
  onHabitTargetComplete?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onHabitMinimum?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onHabitSkip?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onBack?: () => void
  onNext: () => void
}

/**
 * Overdue step: overdue tasks and habit-linked task rows with Target / Minimum / Skip.
 */
export function OverdueScreen({
  overdueTasks,
  overdueHabitReminders,
  loading,
  onEditTask,
  onHabitTargetComplete,
  onHabitMinimum,
  onHabitSkip,
  onBack,
  onNext,
}: OverdueScreenProps) {
  const hasAny =
    overdueTasks.length > 0 || (overdueHabitReminders?.length ?? 0) > 0

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
            No overdue tasks or incomplete habit reminders due yesterday.
          </p>
        </>
      ) : (
        <>
          <p className="text-body font-semibold text-bonsai-brown-700 mb-2">
            What you were supposed to do yesterday (tasks and habits)
          </p>
          <p className="text-body font-medium text-bonsai-slate-700 mb-4">
            Here are overdue tasks from before today, plus incomplete habit reminders due yesterday. Clear or update them, then continue.
          </p>
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
          {overdueHabitReminders && overdueHabitReminders.length > 0 && (
            <div className="space-y-2 mb-4">
              {overdueHabitReminders.map(({ habit, task, remindAt }) => (
                <HabitReminderItem
                  key={habit.id}
                  habit={habit}
                  task={task}
                  remindAt={remindAt}
                  reminderTime={habit.reminder_time}
                  onTargetComplete={() => onHabitTargetComplete?.(habit, task, remindAt)}
                  onMinimum={() => onHabitMinimum?.(habit, task, remindAt)}
                  onSkip={() => onHabitSkip?.(habit, task, remindAt)}
                  density="compact"
                />
              ))}
            </div>
          )}
        </>
      )}

      <BriefingFooter onBack={onBack} onNext={onNext} />
    </div>
  )
}
