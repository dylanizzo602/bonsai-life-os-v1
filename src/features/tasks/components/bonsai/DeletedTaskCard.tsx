/* DeletedTaskCard: Lineup-style row for deleted tasks with always-visible Restore action */

import type { MouseEvent } from 'react'
import { FlagIcon, TrophyIcon } from '../../../../components/icons'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { Button } from '../../../../components/Button'
import { useUserTimeZone } from '../../../settings/useUserTimeZone'
import type { Task } from '../../types'
import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'
import {
  getDueDateColorClass,
  getLineupDateDisplay,
} from '../../utils/taskRowDisplay'
import { getPriorityFlagClasses } from '../../utils/priority'
import { getLineupTagPillClassName } from '../../utils/tagPillStyles'
import { TaskRowMetadataStrip } from './TaskRowMetadataStrip'

interface DeletedTaskCardProps {
  task: Task
  enrichment: TaskRowEnrichment
  goalName?: string | null
  onOpen: () => void
  onContextMenu?: (e: MouseEvent) => void
  onRestore: () => void
}

/**
 * Deleted task row matching lineup cards; Restore is always visible on the right.
 */
export function DeletedTaskCard({
  task,
  enrichment,
  goalName = null,
  onOpen,
  onContextMenu,
  onRestore,
}: DeletedTaskCardProps) {
  const timeZone = useUserTimeZone()
  const primaryTag = task.tags[0]
  const primaryTagForStrip =
    task.goal_id || !primaryTag
      ? null
      : goalName &&
          primaryTag.name.trim().toLowerCase() === goalName.trim().toLowerCase()
        ? null
        : primaryTag

  const dateDisplay = getLineupDateDisplay(task, timeZone)
  const dateColorClass = getDueDateColorClass(task.due_date, timeZone)
  const isRecurring = Boolean(task.recurrence_pattern)
  const showFlag = task.priority !== 'none'

  const renderPriorityIndicator = (sizeClass: string) => {
    if (task.goal_id) {
      return (
        <TrophyIcon
          className={`${sizeClass} shrink-0 stroke-yellow-500 fill-yellow-100 text-yellow-600`}
          aria-hidden
        />
      )
    }
    if (!showFlag) return null
    return (
      <FlagIcon
        className={`${sizeClass} shrink-0 ${getPriorityFlagClasses(task.priority)}`}
        aria-hidden
      />
    )
  }

  const handleRestoreClick = (e: MouseEvent) => {
    e.stopPropagation()
    onRestore()
  }

  const restoreButton = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleRestoreClick}
      className="inline-flex shrink-0 items-center gap-1"
    >
      <MaterialIcon name="restore" className="text-lg" />
      Restore
    </Button>
  )

  const dueAndPriority = (iconSize: string) =>
    dateDisplay || showFlag || task.goal_id ? (
      <div className="flex shrink-0 items-center gap-2">
        {dateDisplay ? (
          <div className={`flex items-center gap-1 text-[12px] font-medium ${dateColorClass}`}>
            <MaterialIcon name="calendar_today" className="text-[16px]" />
            <span>{dateDisplay}</span>
            {isRecurring ? (
              <MaterialIcon name="sync" className="text-[14px]" aria-hidden />
            ) : null}
          </div>
        ) : null}
        {renderPriorityIndicator(iconSize)}
      </div>
    ) : null

  const trailingActions = (iconSize: string) => (
    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
      {dueAndPriority(iconSize)}
      {restoreButton}
    </div>
  )

  return (
    <>
      {/* Mobile: stacked card */}
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
        className="task-card cursor-pointer rounded-xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md lg:hidden"
      >
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-on-surface-variant">
            <MaterialIcon name="delete" className="text-[20px]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 font-semibold leading-tight text-on-surface opacity-80">
                {task.title}
              </h3>
              {trailingActions('h-6 w-6')}
            </div>
            <TaskRowMetadataStrip
              task={task}
              enrichment={enrichment}
              showChecklistAsSubtasks
              compact
              primaryTag={primaryTagForStrip}
              goalName={goalName}
            />
          </div>
        </div>
      </div>

      {/* Desktop/tablet: horizontal row */}
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
        className="task-card hidden cursor-pointer items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition-all hover:bg-surface-container-low lg:flex"
      >
        <div className="flex w-10 shrink-0 items-center justify-center text-on-surface-variant">
          <MaterialIcon name="delete" className="text-[22px]" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-[15px] font-semibold leading-none text-on-surface opacity-80">
              {task.title}
            </h3>
            {primaryTag ? (
              <span className={getLineupTagPillClassName(primaryTag)}>{primaryTag.name}</span>
            ) : null}
          </div>
          <TaskRowMetadataStrip
            task={task}
            enrichment={enrichment}
            showChecklistAsSubtasks
            goalName={goalName}
          />
        </div>

        {trailingActions('h-5 w-5')}
      </div>
    </>
  )
}
