/* OtherTasksSection: Collapsible backlog list with parent/subtask groups */

import { useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import type { Task } from '../../types'
import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'
import { BacklogTaskGroup } from './BacklogTaskGroup'
import { BacklogTaskRow } from './BacklogTaskRow'
import type { BonsaiBacklogPartition } from '../../utils/partitionBonsaiTasks'

interface OtherTasksSectionProps {
  partition: BonsaiBacklogPartition
  getEnrichment: (taskId: string) => TaskRowEnrichment
  hideCompletedSubtasks?: boolean
  onOpenTask: (task: Task) => void
  onContextMenu: (task: Task, e: React.MouseEvent) => void
  onToggleComplete: (task: Task) => void
  /** Optional slot above task rows (e.g. habit reminders). */
  leadingContent?: React.ReactNode
}

/**
 * Collapsible "Other tasks" section with compact backlog rows.
 */
export function OtherTasksSection({
  partition,
  getEnrichment,
  hideCompletedSubtasks = false,
  onOpenTask,
  onContextMenu,
  onToggleComplete,
  leadingContent,
}: OtherTasksSectionProps) {
  const [open, setOpen] = useState(true)
  const { parentTasks, subtasksByParentId } = partition

  if (parentTasks.length === 0 && !leadingContent) return null

  const rows = (
    <div className="mt-4 space-y-2 lg:mt-6">
      {leadingContent}
      {parentTasks.map((task) => {
        const subtasks = subtasksByParentId.get(task.id) ?? []
        const enrichment = getEnrichment(task.id)
        if (subtasks.length > 0) {
          return (
            <BacklogTaskGroup
              key={task.id}
              task={task}
              subtasks={subtasks}
              enrichment={enrichment}
              subtaskEnrichment={(id) => getEnrichment(id)}
              hideCompletedSubtasks={hideCompletedSubtasks}
              onOpen={onOpenTask}
              onContextMenu={onContextMenu}
              onToggleComplete={onToggleComplete}
            />
          )
        }
        return (
          <BacklogTaskRow
            key={task.id}
            task={task}
            enrichment={enrichment}
            onOpen={() => onOpenTask(task)}
            onContextMenu={(e) => onContextMenu(task, e)}
            onToggleComplete={() => onToggleComplete(task)}
          />
        )
      })}
    </div>
  )

  return (
    <section className="max-w-4xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-outline-variant/20 py-4 transition-colors hover:text-primary lg:justify-start lg:gap-3"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 lg:gap-3">
          <MaterialIcon
            name="chevron_right"
            className={`text-on-surface-variant transition-transform lg:text-outline ${open ? 'rotate-90' : ''}`}
          />
          <h2 className="text-secondary font-bold uppercase tracking-wide text-on-surface-variant lg:text-xl lg:font-semibold lg:normal-case lg:text-on-surface">
            Other tasks
          </h2>
        </div>
        <div className="mx-4 hidden h-px flex-1 bg-surface-container-highest lg:block" />
      </button>
      {open ? rows : null}
    </section>
  )
}
