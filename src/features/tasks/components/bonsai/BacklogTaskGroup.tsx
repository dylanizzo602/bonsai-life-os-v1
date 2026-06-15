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
  onUpdateStatus?: (taskId: string, status: import('../../types').TaskStatus) => Promise<void>
  onUpdateTask?: (taskId: string, input: import('../../types').UpdateTaskInput) => Promise<void>
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
  onUpdateStatus,
  onUpdateTask,
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
        onUpdateStatus={onUpdateStatus}
        onUpdateTask={onUpdateTask}
      />
      {expanded ? (
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
              onUpdateStatus={onUpdateStatus}
              onUpdateTask={onUpdateTask}
            />
          ))}
          {/* Add subtask: opens parent in edit modal where subtasks are managed */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen(task)
            }}
            className="w-full py-1 text-left text-secondary font-medium text-primary hover:underline"
          >
            + Add a new subtask
          </button>
        </div>
      ) : null}
    </div>
  )
}
