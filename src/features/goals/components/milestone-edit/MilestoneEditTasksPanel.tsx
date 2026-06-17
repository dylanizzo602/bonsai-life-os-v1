/* MilestoneEditTasksPanel: Linked tasks checklist for task-type milestone edit */
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { useUserTimeZone } from '../../../settings/useUserTimeZone'
import { formatStartDueDisplay } from '../../../tasks/utils/date'
import type { Task } from '../../../tasks/types'

interface MilestoneEditTasksPanelProps {
  tasks: Task[]
  onOpenTask?: (task: Task) => void
}

/**
 * Read-only linked task checklist with completion counts for edit mode.
 */
export function MilestoneEditTasksPanel({ tasks, onOpenTask }: MilestoneEditTasksPanelProps) {
  const timeZone = useUserTimeZone()

  /* Counted tasks: exclude soft-deleted rows */
  const counted = tasks.filter((t) => t.status !== 'deleted')
  const doneCount = counted.filter((t) => t.status === 'completed').length

  const taskSubtitle = (task: Task): string | null => {
    const dueText = formatStartDueDisplay(task.start_date, task.due_date, timeZone)
    if (dueText) return dueText
    const firstTag = task.tags?.[0]?.name
    if (firstTag) return firstTag
    return null
  }

  return (
    <div className="space-y-4 rounded-lg bg-surface-container-low p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-outline">Linked Tasks</h2>
        <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
          {doneCount} of {counted.length} Complete
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {counted.length === 0 ? (
          <p className="text-secondary text-on-surface-variant">No linked tasks.</p>
        ) : (
          counted.map((task) => {
            const isComplete = task.status === 'completed'
            const subtitle = taskSubtitle(task)
            const subtitleIcon = task.due_date || task.start_date ? 'schedule' : 'category'

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask?.(task)}
                className={`group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-transparent p-3 text-left transition-colors hover:bg-surface-container-low ${
                  isComplete ? 'opacity-60' : ''
                }`}
              >
                {isComplete ? (
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                    <MaterialIcon name="check" className="text-[14px] font-bold text-on-primary" />
                  </div>
                ) : (
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant transition-colors group-hover:border-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`mb-1 text-[15px] font-medium leading-tight ${
                      isComplete
                        ? 'text-on-surface-variant line-through'
                        : 'text-on-surface'
                    }`}
                  >
                    {task.title}
                  </p>
                  {subtitle ? (
                    <p className="flex items-center gap-1 text-[13px] text-on-surface-variant">
                      <MaterialIcon name={subtitleIcon} className="text-[13px]" />
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
