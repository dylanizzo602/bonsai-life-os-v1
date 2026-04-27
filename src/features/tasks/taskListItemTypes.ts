/* TaskListItem types: unified props for desktop, tablet, and compact task row layouts */

import type { Task, TaskStatus, UpdateTaskInput } from './types'

/** How the row chooses its layout: viewport-driven, or forced for narrow widgets / subtask rows */
export type TaskListItemLayoutMode = 'responsive' | 'compact' | 'tablet' | 'full'

export interface TaskListItemProps {
  /** Task data to display */
  task: Task
  /** When this task is a subtask, the parent task title for display (e.g. "Subtask of Project X") */
  parentTaskTitle?: string | null
  /**
   * Layout strategy: `responsive` follows viewport (mobile=compact, tablet=stacked, desktop=full row).
   * Use `compact` in sidebars/widgets; `tablet` for subtask rows; `full` to always use the wide desktop row.
   */
  layout?: TaskListItemLayoutMode
  /** Whether this task has subtasks (shows chevron and allows expand) */
  hasSubtasks?: boolean
  /** Total number of subtasks (used for completed/total display) */
  subtaskCount?: number
  /** Number of subtasks not yet completed (icon badge + unresolved-items confirm modal) */
  incompleteSubtaskCount?: number
  /** Checklist completed/total when task has checklists */
  checklistSummary?: { completed: number; total: number }
  /** Total time in minutes (task estimate + sum of subtask estimates) for tooltip display */
  totalTimeWithSubtasks?: number | null
  /** Task is blocked by another (show blocked icon) */
  isBlocked?: boolean
  /** Task is blocking another (show warning icon) */
  isBlocking?: boolean
  /** Number of tasks this task is blocking (for tooltip) */
  blockingCount?: number
  /** Number of tasks blocking this task (for tooltip) */
  blockedByCount?: number
  /** Task is shared with another user (show two-person icon) */
  isShared?: boolean
  /** Whether subtask section is expanded */
  expanded?: boolean
  /** Toggle expand/collapse when chevron is clicked */
  onToggleExpand?: () => void
  /** Called when user expands to add a subtask (e.g. focus add-subtask input) */
  onExpandForSubtask?: () => void
  /** Optional click on the row (e.g. open edit) */
  onClick?: () => void
  /** Optional right-click context menu (e.g. show task options popover) */
  onContextMenu?: (e: React.MouseEvent) => void
  /** When set, show inline text input to edit task title (Rename from context menu); save on Enter/blur, cancel on Escape */
  inlineEditTitle?: {
    value: string
    onSave: (newTitle: string) => void | Promise<void>
    onCancel: () => void
  }
  /** Function to update task status */
  onUpdateStatus?: (taskId: string, status: TaskStatus) => Promise<void>
  /** Complete task and mark all subtasks and checklist items complete (for unresolved-items modal) */
  onCompleteTaskAndResolveAll?: (taskId: string) => Promise<void>
  /** Function to update task (for time estimate and other fields) */
  onUpdateTask?: (taskId: string, input: UpdateTaskInput) => Promise<void>
  /** Called after tags are updated (e.g. to refetch task list) */
  onTagsUpdated?: () => void
  /** Fetch all tasks (for dependency popover) */
  getTasks?: () => Promise<Task[]>
  /** Fetch task dependencies */
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('./types').TaskDependency[]
    blockedBy: import('./types').TaskDependency[]
  }>
  /** Create a task dependency */
  onAddDependency?: (input: import('./types').CreateTaskDependencyInput) => Promise<void>
  /** Remove a task dependency by id */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** Called when dependencies change (e.g. to refetch enrichment) */
  onDependenciesChanged?: () => void
  /** Optional remove handler (shows × button; compact / tablet in modals) */
  onRemove?: () => void
  /** Optional handler for dependency icon tap (compact / tablet) */
  onDependencyClick?: () => void
  /** Optional date label formatter (dependency lists, widgets) */
  formatDueDate?: (iso: string | null | undefined) => string | null
}

/** Visual layout after resolving `layout` prop + viewport */
export type TaskListItemVisualLayout = 'full' | 'tablet' | 'compact'
