/* BacklogTaskGroup: Parent task with expandable subtasks in Other tasks */

import { useState, type MouseEvent } from 'react'
import type { Task } from '../../types'
import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'
import { BacklogTaskRow } from './BacklogTaskRow'

interface BacklogTaskGroupProps {
  task: Task
  subtasks: Task[]
  enrichment: TaskRowEnrichment
  subtaskEnrichment: (id: string) => TaskRowEnrichment
  hideCompletedSubtasks?: boolean
  onOpen: (task: Task) => void
  onContextMenu: (task: Task, e: MouseEvent) => void
  onToggleComplete: (task: Task) => void
}

/**
 * Parent backlog row with indented subtask list.
 */
export function BacklogTaskGroup({
  task,
  subtasks,
  enrichment,
  subtaskEnrichment,
  hideCompletedSubtasks = false,
  onOpen,
  onContextMenu,
  onToggleComplete,
}: BacklogTaskGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleSubtasks = hideCompletedSubtasks
    ? subtasks.filter((s) => s.status !== 'completed')
    : subtasks

  return (
    <div className="group/item">
      <BacklogTaskRow
        task={task}
        enrichment={enrichment}
        showChevron={subtasks.length > 0}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        onOpen={() => onOpen(task)}
        onContextMenu={(e) => onContextMenu(task, e)}
        onToggleComplete={() => onToggleComplete(task)}
      />
      {expanded && visibleSubtasks.length > 0 ? (
        <div className="ml-4 space-y-2 border-l-2 border-surface-container-highest pl-4 lg:ml-12 lg:space-y-1 lg:border-l lg:border-outline-variant/30 lg:pl-0">
          {visibleSubtasks.map((sub) => (
            <BacklogTaskRow
              key={sub.id}
              task={sub}
              enrichment={subtaskEnrichment(sub.id)}
              size="sm"
              onOpen={() => onOpen(sub)}
              onContextMenu={(e) => onContextMenu(sub, e)}
              onToggleComplete={() => onToggleComplete(sub)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
