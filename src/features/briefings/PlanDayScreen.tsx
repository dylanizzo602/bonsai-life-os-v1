/* PlanDayScreen: Today's agenda + lineup + backlog search */

import { MaterialIcon } from '../../components/MaterialIcon'
import { AgendaTimeline } from './components/AgendaTimeline'
import { BacklogAddPanel } from './components/BacklogAddPanel'
import { BriefingLineupTaskRow } from './components/BriefingLineupTaskRow'
import { BriefingShell, BriefingScreenHeading } from './components/BriefingShell'
import type { Task } from '../tasks/types'

interface PlanDayScreenProps {
  lineupTasks: Task[]
  backlogCandidates: Task[]
  goalsById: Record<string, string>
  onAddToLineUp: (taskId: string) => void
  onEditTask: (task: Task) => void
  onToggleComplete: (taskId: string) => void
  onClose?: () => void
}

/**
 * Plan your day: agenda timeline, Today's Lineup, searchable backlog adds.
 */
export function PlanDayScreen({
  lineupTasks,
  backlogCandidates,
  goalsById,
  onAddToLineUp,
  onEditTask,
  onToggleComplete,
  onClose,
}: PlanDayScreenProps) {
  return (
    <BriefingShell>
      <BriefingScreenHeading
        title="Today's Plan"
        description="Align your schedule with your intentions."
        onClose={onClose}
        centered
      />

      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <section className="md:col-span-5">
          <AgendaTimeline
            events={[]}
            loading={false}
            error={null}
            comingSoon
          />
        </section>

        <section className="flex flex-col gap-12 md:col-span-7">
          <div>
            <h2 className="text-body mb-6 flex items-center gap-2 font-medium text-on-surface">
              <MaterialIcon name="checklist" className="text-primary" />
              Today&apos;s Lineup
            </h2>
            {lineupTasks.length === 0 ? (
              <p className="text-body mb-4 text-on-surface-variant">
                No tasks in your lineup yet. Add from your backlog below.
              </p>
            ) : (
              <div className="space-y-3">
                {lineupTasks.map((task) => (
                  <BriefingLineupTaskRow
                    key={task.id}
                    task={task}
                    goalName={task.goal_id ? goalsById[task.goal_id] : null}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEditTask}
                  />
                ))}
              </div>
            )}
          </div>

          <BacklogAddPanel candidates={backlogCandidates} onAddToLineUp={onAddToLineUp} />
        </section>
      </div>
    </BriefingShell>
  )
}

/** Primary CTA for plan step footer slot */
export function PlanDayFinishButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-primary px-12 py-4 text-body font-semibold text-on-primary shadow-lg shadow-primary/10 transition-all hover:bg-primary-container hover:scale-[1.02] active:scale-95"
    >
      Finish Planning
    </button>
  )
}
