/* CompactTaskItem: Narrow-context alias for TaskListItem with a fixed compact layout */

import { TaskListItem } from './TaskListItem'
import type { TaskListItemProps } from './taskListItemTypes'

export type CompactTaskItemProps = Omit<TaskListItemProps, 'layout'>

/**
 * Compact task row for sidebars, modals, and widgets — always uses the dense layout regardless of viewport.
 */
export function CompactTaskItem(props: CompactTaskItemProps) {
  return <TaskListItem {...props} layout="compact" />
}
