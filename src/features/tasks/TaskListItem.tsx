/* TaskListItem: Single task row component; layout follows viewport or an explicit layout preset */

import { resolveTaskListVisualLayout, useTaskListLayout } from './taskListItemShared'
import type { TaskListItemProps } from './taskListItemTypes'
import { TaskListItemCompactLayout } from './TaskListItemCompact'
import { TaskListItemDesktopLayout } from './TaskListItemDesktop'
import { TaskListItemTabletLayout } from './TaskListItemTablet'

export type { TaskListItemLayoutMode, TaskListItemProps } from './taskListItemTypes'
export { useTaskListLayout, resolveTaskListVisualLayout } from './taskListItemShared'
export type { TaskListViewport } from './taskListItemShared'

/**
 * One task row for lists, widgets, and modals: picks a dense compact row, stacked tablet row,
 * or full desktop row from `layout` and the current viewport (Tailwind `md` / `lg` breakpoints).
 */
export function TaskListItem({ layout: layoutProp = 'responsive', ...props }: TaskListItemProps) {
  const viewport = useTaskListLayout()
  const visual = resolveTaskListVisualLayout(layoutProp, viewport)

  if (visual === 'full') {
    return <TaskListItemDesktopLayout {...props} />
  }
  if (visual === 'tablet') {
    return <TaskListItemTabletLayout {...props} />
  }
  return <TaskListItemCompactLayout {...props} />
}
