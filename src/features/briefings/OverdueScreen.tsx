/* OverdueScreen: Missed-items catch-up step (tasks + habits) */

import { MaterialIcon } from '../../components/MaterialIcon'
import { BriefingHabitCatchUpCard } from './components/BriefingHabitCatchUpCard'
import { BriefingOverdueTaskRow } from './components/BriefingOverdueTaskRow'
import { useUserTimeZone } from '../settings/useUserTimeZone'
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
  onToggleComplete: (taskId: string) => void
  onHabitTargetComplete?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onHabitMinimum?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onHabitSkip?: (habit: HabitWithStreaks, task: Task, remindAt: string | null) => void
  onContinue: () => void
}

/**
 * Missed-items step: overdue tasks and unfinished habit reminders from yesterday.
 */
export function OverdueScreen({
  overdueTasks,
  overdueHabitReminders,
  loading,
  onEditTask,
  onToggleComplete,
  onHabitTargetComplete,
  onHabitMinimum,
  onHabitSkip,
  onContinue,
}: OverdueScreenProps) {
  const timeZone = useUserTimeZone()
  const habits = overdueHabitReminders ?? []

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-40 pt-8 md:px-6">
      {/* Hero */}
      <div className="relative mb-10 h-48 w-full overflow-hidden rounded-xl">
        <img
          src="/images/morning-briefing-hero.jpg"
          alt=""
          className="h-full w-full object-cover opacity-90 grayscale-[20%] sepia-[10%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
      </div>

      <div className="mb-12 text-center">
        <h1 className="text-page-title mb-4 font-semibold leading-tight text-on-surface">
          Looks like you might have missed something.
        </h1>
        <p className="text-body mx-auto max-w-lg text-on-surface-variant">
          Don&apos;t worry, your garden is patient. Take a moment to review and clear these items
          from yesterday.
        </p>
      </div>

      {loading ? (
        <p className="text-body text-on-surface-variant">Loading…</p>
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <MaterialIcon name="history" className="text-sm text-primary" />
                <h2 className="text-secondary text-xs font-bold uppercase tracking-widest text-outline">
                  Overdue Tasks
                </h2>
              </div>
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <BriefingOverdueTaskRow
                    key={task.id}
                    task={task}
                    timeZone={timeZone}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEditTask}
                  />
                ))}
              </div>
            </section>
          )}

          {habits.length > 0 && (
            <section className="mb-16">
              <div className="mb-4 flex items-center gap-2">
                <MaterialIcon name="auto_awesome" className="text-sm text-primary" />
                <h2 className="text-secondary text-xs font-bold uppercase tracking-widest text-outline">
                  Unfinished Habits
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {habits.map(({ habit, task, remindAt }) => (
                  <BriefingHabitCatchUpCard
                    key={habit.id}
                    habit={habit}
                    hasMinimumAction={Boolean(habit.minimum_action?.trim())}
                    onTargetComplete={() => onHabitTargetComplete?.(habit, task, remindAt)}
                    onMinimum={() => onHabitMinimum?.(habit, task, remindAt)}
                    onSkip={() => onHabitSkip?.(habit, task, remindAt)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="pt-8">
        <button
          type="button"
          onClick={onContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-body font-bold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-[0.98]"
        >
          Continue to Today&apos;s Plan
          <MaterialIcon name="arrow_forward" />
        </button>
        <p className="text-secondary mt-4 text-center text-xs text-outline">
          These items will be archived if not addressed.
        </p>
      </div>
    </div>
  )
}
