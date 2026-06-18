/* LineupTaskCard: Rich card row for Today's Lineup section */



import { useRef, useState, type MouseEvent } from 'react'

import { TrophyIcon } from '../../../../components/icons'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { PriorityFlagIcon } from '../PriorityFlagIcon'

import { useUserTimeZone } from '../../../settings/useUserTimeZone'

import type { Task, Tag } from '../../types'

import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'

import {

  getDueDateColorClass,

  getLineupDateDisplay,

} from '../../utils/taskRowDisplay'

import { getLineupTagPillClassName } from '../../utils/tagPillStyles'

import { TagModal } from '../../modals/TagModal'
import { StatusPickerModal } from '../../modals/StatusPickerModal'
import { PriorityPickerModal } from '../../modals/PriorityPickerModal'

import { TaskRowMetadataStrip } from './TaskRowMetadataStrip'

import { BonsaiTaskStatusButton } from './BonsaiTaskStatusButton'
import { getTaskDisplayStatus, getTaskStatusFromDisplayStatus } from '../../TaskStatusIndicator'
import { useTaskListLayout } from '../../taskListItemShared'
import type { UpdateTaskInput } from '../../types'



interface LineupTaskCardProps {

  task: Task

  enrichment: TaskRowEnrichment

  onOpen: () => void

  onContextMenu?: (e: MouseEvent) => void

  onUpdateStatus?: (taskId: string, status: import('../../types').TaskStatus) => Promise<void>

  onUpdateTask?: (taskId: string, input: UpdateTaskInput) => Promise<void>

  onTagsUpdated?: () => void

  setTagsForTask: (taskId: string, tags: Tag[]) => Promise<void>

  searchTags: (query: string) => Promise<Tag[]>

  createTag: (name: string, color: import('../../types').TagColorId) => Promise<Tag>

  updateTag?: (tagId: string, updates: { name?: string; color?: import('../../types').TagColorId }) => Promise<Tag>

  deleteTagFromAllTasks?: (tagId: string) => Promise<void>

  /** Goal title when task.goal_id is set (from parent useGoals) */
  goalName?: string | null

}



/**

 * Bonsai lineup task card: stacked mobile card, horizontal row on desktop/tablet.

 */

export function LineupTaskCard({

  task,

  enrichment,

  onOpen,

  onContextMenu,

  onUpdateStatus,

  onUpdateTask,

  onTagsUpdated,

  setTagsForTask,

  searchTags,

  createTag,

  updateTag,

  deleteTagFromAllTasks,

  goalName = null,

}: LineupTaskCardProps) {

  const timeZone = useUserTimeZone()
  const lineupLayout = useTaskListLayout()
  const isDesktopLineupLayout = lineupLayout === 'desktop'

  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const statusButtonRef = useRef<HTMLButtonElement>(null)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)

  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false)

  const primaryTag = task.tags[0]

  /* Mobile metadata: hide tag when goal-linked (goal row shows goal name instead) */
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

  const isCompleted = task.status === 'completed'

  /* Priority indicator: Material flag colors match priority picker; trophy when goal-linked */
  const renderPriorityIndicator = (flagSizeClass: string, trophySizeClass: string) => {
    if (task.goal_id) {
      return (
        <TrophyIcon
          className={`${trophySizeClass} shrink-0 stroke-yellow-500 fill-yellow-100 text-yellow-600`}
          aria-hidden
        />
      )
    }
    if (!showFlag) return null
    return <PriorityFlagIcon priority={task.priority} className={flagSizeClass} />
  }

  /* Priority control: Tappable when onUpdateTask is set (opens shared priority picker popover). */
  const renderPriorityControl = (
    flagSizeClass: string,
    trophySizeClass: string,
    attachTriggerRef: boolean,
  ) => {
    if (!showFlag && !task.goal_id) return null

    const indicator = renderPriorityIndicator(flagSizeClass, trophySizeClass)
    if (!indicator) return null

    if (!onUpdateTask) return indicator

    return (
      <button
        ref={attachTriggerRef ? priorityButtonRef : undefined}
        type="button"
        data-task-interactive
        onClick={(e) => {
          e.stopPropagation()
          setPriorityPickerOpen(true)
        }}
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-surface-container-low"
        aria-label={task.goal_id ? 'Edit priority (linked to goal)' : 'Edit priority'}
      >
        {indicator}
      </button>
    )
  }



  const handleRowClick = () => onOpen()



  /* Status click: open the shared status picker popover (matches desktop/tablet behavior). */
  const handleStatusClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (!onUpdateStatus) return
    setStatusPickerOpen(true)
  }



  const tagModal = (

    <TagModal

      isOpen={tagModalOpen}

      onClose={() => setTagModalOpen(false)}

      value={task.tags}

      onSave={async (tags) => {

        await setTagsForTask(task.id, tags)

        onTagsUpdated?.()

      }}

      triggerRef={tagButtonRef}

      taskId={task.id}

      searchTags={searchTags}

      createTag={createTag}

      updateTag={updateTag}

      deleteTagFromAllTasks={deleteTagFromAllTasks}

    />

  )



  return (

    <>
      {/* Status picker: reuse the shared popover so mobile has the same status options. */}
      {onUpdateStatus ? (
        <StatusPickerModal
          isOpen={statusPickerOpen}
          onClose={() => setStatusPickerOpen(false)}
          value={getTaskDisplayStatus(task.status)}
          triggerRef={statusButtonRef}
          onSelect={async (newDisplayStatus) => {
            const nextStatus = getTaskStatusFromDisplayStatus(newDisplayStatus)
            await onUpdateStatus(task.id, nextStatus)
          }}
        />
      ) : null}

      {/* Priority picker: same popover as desktop/tablet task rows */}
      {onUpdateTask ? (
        <PriorityPickerModal
          isOpen={priorityPickerOpen}
          onClose={() => setPriorityPickerOpen(false)}
          value={task.priority}
          triggerRef={priorityButtonRef}
          onSelect={async (newPriority) => {
            await onUpdateTask(task.id, { priority: newPriority })
          }}
        />
      ) : null}

      {/* Mobile: stacked card */}

      <div

        role="button"

        tabIndex={0}

        onClick={handleRowClick}

        onContextMenu={onContextMenu}

        onKeyDown={(e) => {

          if (e.key === 'Enter' || e.key === ' ') {

            e.preventDefault()

            onOpen()

          }

        }}

        className="task-card group cursor-pointer rounded-xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md lg:hidden"

      >

        <div className="flex items-start gap-4">

          <div className="mt-1 shrink-0">

            <BonsaiTaskStatusButton
              status={task.status}
              buttonRef={!isDesktopLineupLayout ? statusButtonRef : undefined}
              onClick={handleStatusClick}
              disabled={!onUpdateStatus}
            />

          </div>

          <div className="min-w-0 flex-1 space-y-3">

            <div className="flex items-start justify-between gap-2">

              <h3

                className={`min-w-0 flex-1 font-semibold leading-tight text-on-surface ${isCompleted ? 'line-through opacity-50' : ''}`}

              >

                {task.title}

              </h3>

              {/* Mobile: due date immediately left of priority flag (matches desktop row) */}
              {(dateDisplay || showFlag || task.goal_id) ? (
                <div className="flex shrink-0 items-center gap-2">
                  {dateDisplay ? (
                    <div
                      className={`flex items-center gap-1 text-[12px] font-medium ${dateColorClass}`}
                    >
                      <MaterialIcon name="calendar_today" className="text-[16px]" />
                      <span>{dateDisplay}</span>
                      {isRecurring ? (
                        <MaterialIcon name="sync" className="text-[14px]" aria-hidden />
                      ) : null}
                    </div>
                  ) : null}
                  {renderPriorityControl('text-2xl', 'h-6 w-6', !isDesktopLineupLayout)}
                </div>
              ) : null}

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

        onClick={handleRowClick}

        onContextMenu={onContextMenu}

        onKeyDown={(e) => {

          if (e.key === 'Enter' || e.key === ' ') {

            e.preventDefault()

            onOpen()

          }

        }}

        className="task-card group hidden cursor-pointer items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition-all hover:bg-surface-container-low lg:flex"

      >

        <div className="flex w-10 shrink-0 items-center justify-center">

          <BonsaiTaskStatusButton
            status={task.status}
            buttonRef={isDesktopLineupLayout ? statusButtonRef : undefined}
            onClick={handleStatusClick}
            disabled={!onUpdateStatus}
          />

        </div>



        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <h3 className="text-[15px] font-semibold leading-none text-on-surface">{task.title}</h3>

            {primaryTag ? (

              <span className={getLineupTagPillClassName(primaryTag)}>{primaryTag.name}</span>

            ) : (
              null
            )}

          </div>

          <TaskRowMetadataStrip
            task={task}
            enrichment={enrichment}
            showChecklistAsSubtasks
            goalName={goalName}
          />

        </div>



        <div className="flex shrink-0 items-center gap-4">

          {dateDisplay ? (

            <div className={`flex items-center gap-1 text-[11px] font-medium ${dateColorClass}`}>

              <MaterialIcon name="calendar_today" className="text-[16px]" />

              <span className="flex items-center gap-1">

                {dateDisplay}

                {isRecurring ? (

                  <MaterialIcon name="sync" className="text-[14px]" aria-hidden />

                ) : null}

              </span>

            </div>

          ) : null}

          {renderPriorityControl('text-xl', 'h-5 w-5', isDesktopLineupLayout)}

        </div>

      </div>



      {tagModal}

    </>

  )

}


