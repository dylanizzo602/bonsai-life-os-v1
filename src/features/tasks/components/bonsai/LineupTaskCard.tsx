/* LineupTaskCard: Rich card row for Today's Lineup section */



import { useRef, useState, type MouseEvent } from 'react'

import { FlagIcon, TrophyIcon } from '../../../../components/icons'
import { MaterialIcon } from '../../../../components/MaterialIcon'

import { useUserTimeZone } from '../../../settings/useUserTimeZone'

import type { Task, Tag } from '../../types'

import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'

import {

  getDueDateColorClass,

  getLineupDateDisplay,

} from '../../utils/taskRowDisplay'

import { getPriorityFlagClasses } from '../../utils/priority'

import { getLineupTagPillClassName } from '../../utils/tagPillStyles'

import { TagModal } from '../../modals/TagModal'
import { StatusPickerModal } from '../../modals/StatusPickerModal'

import { TaskRowMetadataStrip } from './TaskRowMetadataStrip'

import { BonsaiTaskStatusButton } from './BonsaiTaskStatusButton'
import { getTaskDisplayStatus, getTaskStatusFromDisplayStatus } from '../../TaskStatusIndicator'



interface LineupTaskCardProps {

  task: Task

  enrichment: TaskRowEnrichment

  onOpen: () => void

  onContextMenu?: (e: MouseEvent) => void

  onUpdateStatus?: (taskId: string, status: import('../../types').TaskStatus) => Promise<void>

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

  onTagsUpdated,

  setTagsForTask,

  searchTags,

  createTag,

  updateTag,

  deleteTagFromAllTasks,

  goalName = null,

}: LineupTaskCardProps) {

  const timeZone = useUserTimeZone()

  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const statusButtonRef = useRef<HTMLButtonElement>(null)

  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)

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

  /* Priority indicator: SVG flag colors match task list rows; trophy when goal-linked */
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
              buttonRef={statusButtonRef}
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
                  {renderPriorityIndicator('h-6 w-6')}
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

          <BonsaiTaskStatusButton status={task.status} onClick={handleStatusClick} />

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

          {renderPriorityIndicator('h-5 w-5')}

        </div>

      </div>



      {tagModal}

    </>

  )

}


