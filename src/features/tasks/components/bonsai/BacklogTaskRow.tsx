/* BacklogTaskRow: Compact row for Other tasks section */

import type { MouseEvent } from 'react'
import { FlagIcon, TrophyIcon } from '../../../../components/icons'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { useUserTimeZone } from '../../../settings/useUserTimeZone'
import type { Task } from '../../types'
import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'
import {
  getBacklogDateDisplay,
  getDueDateColorClass,
} from '../../utils/taskRowDisplay'
import { getPriorityFlagClasses } from '../../utils/priority'
import { getBacklogTagPillClassName } from '../../utils/tagPillStyles'
import { BonsaiTaskStatusButton } from './BonsaiTaskStatusButton'

interface BacklogTaskRowProps {
  task: Task
  enrichment: TaskRowEnrichment
  size?: 'md' | 'sm'
  showChevron?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  onOpen: () => void
  onContextMenu?: (e: MouseEvent) => void
  onToggleComplete: () => void
}

/**
 * Simpler backlog task row with optional chevron for parent tasks.
 */
export function BacklogTaskRow({
  task,
  enrichment,
  size = 'md',
  showChevron = false,
  expanded = false,
  onToggleExpand,
  onOpen,
  onContextMenu,
  onToggleComplete,
}: BacklogTaskRowProps) {
  const timeZone = useUserTimeZone()
  const primaryTag = task.tags[0]
  const dateDisplay = getBacklogDateDisplay(task, timeZone)
  const dateColorClass = getDueDateColorClass(task.due_date, timeZone)
  const statusSize = size === 'sm' ? 'sm' : 'md'
  const titleClass =
    size === 'sm'
      ? 'text-on-surface-variant text-sm flex-1'
      : 'text-body font-medium text-on-surface-variant transition-colors group-hover:text-on-surface'

  return (
    <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onContextMenu={onContextMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        className={`group flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent px-3 transition-all hover:border-outline-variant hover:bg-surface-container-low lg:items-center lg:justify-start lg:gap-4 lg:rounded-xl lg:border-transparent lg:px-4 lg:hover:bg-surface-container ${
          size === 'sm' ? 'py-2 lg:py-2' : 'py-3 lg:py-4'
        }`}
      >
        <div className="flex items-center gap-2">
          {showChevron ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.()
              }}
              className="flex shrink-0 items-center justify-center p-0.5 text-outline transition-transform hover:text-primary"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <MaterialIcon
                name="chevron_right"
                className={`text-sm transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
          ) : null}
          <BonsaiTaskStatusButton
            status={task.status}
            size={statusSize}
            onClick={(e) => {
              e.stopPropagation()
              if (task.status !== 'completed') onToggleComplete()
            }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <span className={`min-w-0 truncate ${titleClass}`}>{task.title}</span>
          {primaryTag ? (
            <span className={getBacklogTagPillClassName(primaryTag)}>{primaryTag.name}</span>
          ) : null}
          {enrichment.isBlocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter text-error">
              <MaterialIcon name="block" className="text-[14px]" />
              <span>Blocked</span>
            </span>
          ) : null}
        </div>

        <div className={`flex shrink-0 items-center gap-6 text-[11px] font-medium ${dateColorClass}`}>
          {dateDisplay ? <span className="flex items-center gap-1">{dateDisplay}</span> : null}
          {task.goal_id ? (
            <TrophyIcon
              className="h-5 w-5 shrink-0 stroke-yellow-500 fill-yellow-100 text-yellow-600"
              aria-hidden
            />
          ) : task.priority !== 'none' ? (
            <FlagIcon
              className={`h-5 w-5 shrink-0 ${getPriorityFlagClasses(task.priority)}`}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
  )
}
