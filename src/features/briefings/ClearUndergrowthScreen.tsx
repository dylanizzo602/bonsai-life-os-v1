/* ClearUndergrowthScreen: Sunday step to review filler tasks before planning */

import { MaterialIcon } from '../../components/MaterialIcon'
import { formatTaskAgeLabel } from './utils/undergrowthTasks'
import type { Task } from '../tasks/types'

interface ClearUndergrowthScreenProps {
  tasks: Task[]
  onDeleteTask: (task: Task) => void
  onEditTask: (task: Task) => void
}

/**
 * Sunday undergrowth cleanup: low-priority / stale tasks before planning.
 * Primary CTA lives in BriefingProgressFooter (parent).
 */
export function ClearUndergrowthScreen({
  tasks,
  onDeleteTask,
  onEditTask,
}: ClearUndergrowthScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col px-4 pb-40 pt-8 md:px-8 md:py-12">
      <header className="mb-12 text-center md:text-left">
        <div className="mb-6 flex items-center justify-center gap-3 md:justify-start">
          <MaterialIcon name="eco" className="text-4xl text-primary" />
          <span className="text-body font-semibold text-primary">Bonsai</span>
        </div>
        <h1 className="text-page-title mb-4 font-semibold tracking-tight text-on-surface">
          Clear the undergrowth.
        </h1>
        <p className="text-body mx-auto max-w-[600px] leading-relaxed text-on-surface-variant md:mx-0">
          These low-priority tasks have no due dates. Remove filler to keep your focus on what truly
          matters.
        </p>
      </header>

      <section className="mb-24 space-y-4">
        {tasks.length === 0 ? (
          <p className="text-body text-on-surface-variant">Nothing to clear right now.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col justify-between gap-6 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 transition-all hover:bg-surface-container-high md:flex-row md:items-center"
            >
              <div className="flex flex-col gap-1">
                <span className="text-body font-semibold text-on-surface">{task.title}</span>
                <span className="text-secondary text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {formatTaskAgeLabel(task.created_at)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onDeleteTask(task)}
                  className="flex items-center justify-center rounded-xl border border-outline-variant p-3 text-error transition-colors hover:bg-error-container hover:text-on-error-container"
                  aria-label={`Delete ${task.title}`}
                >
                  <MaterialIcon name="delete" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="flex items-center gap-2 rounded-xl border border-secondary px-4 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary-container"
                >
                  <MaterialIcon name="event" className="text-[20px]" />
                  Add Due Date
                </button>
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="flex items-center gap-2 rounded-xl border border-secondary px-4 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary-container"
                >
                  <MaterialIcon name="low_priority" className="text-[20px]" />
                  Set Priority
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="py-12">
        <div className="relative h-[200px] w-full overflow-hidden rounded-2xl">
          <img
            src="/images/undergrowth-hero.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40 brightness-110 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
      </section>

      <p className="text-secondary text-center text-sm italic text-on-surface-variant md:text-left">
        Focus on the essentials. The rest can wait.
      </p>
    </div>
  )
}
