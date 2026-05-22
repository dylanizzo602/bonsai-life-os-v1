/* LineupTaskCard: Rich card row for Today's Lineup section */



import { useRef, useState, type MouseEvent } from 'react'

import { MaterialIcon } from '../../../../components/MaterialIcon'

import { useUserTimeZone } from '../../../settings/useUserTimeZone'

import type { Task, Tag } from '../../types'

import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'

import {

  getDueDateColorClass,

  getLineupDateDisplay,

  getPriorityFlagColorClass,

} from '../../utils/taskRowDisplay'

import { getLineupTagPillClassName } from '../../utils/tagPillStyles'

import { TagModal } from '../../modals/TagModal'

import { TaskRowMetadataStrip } from './TaskRowMetadataStrip'

import { BonsaiTaskStatusButton } from './BonsaiTaskStatusButton'



interface LineupTaskCardProps {

  task: Task

  enrichment: TaskRowEnrichment

  onOpen: () => void

  onContextMenu?: (e: MouseEvent) => void

  onToggleComplete: () => void

  onTagsUpdated?: () => void

  setTagsForTask: (taskId: string, tags: Tag[]) => Promise<void>

  searchTags: (query: string) => Promise<Tag[]>

  createTag: (name: string, color: import('../../types').TagColorId) => Promise<Tag>

  updateTag?: (tagId: string, updates: { name?: string; color?: import('../../types').TagColorId }) => Promise<Tag>

  deleteTagFromAllTasks?: (tagId: string) => Promise<void>

}



/**

 * Bonsai lineup task card: stacked mobile card, horizontal row on desktop/tablet.

 */

export function LineupTaskCard({

  task,

  enrichment,

  onOpen,

  onContextMenu,

  onToggleComplete,

  onTagsUpdated,

  setTagsForTask,

  searchTags,

  createTag,

  updateTag,

  deleteTagFromAllTasks,

}: LineupTaskCardProps) {

  const timeZone = useUserTimeZone()

  const tagButtonRef = useRef<HTMLButtonElement>(null)

  const [tagModalOpen, setTagModalOpen] = useState(false)

  const primaryTag = task.tags[0]

  const dateDisplay = getLineupDateDisplay(task, timeZone)

  const dateColorClass = getDueDateColorClass(task.due_date, timeZone)

  const isRecurring = Boolean(task.recurrence_pattern)

  const showFlag = task.priority !== 'none'

  const isCompleted = task.status === 'completed'



  const handleRowClick = () => onOpen()



  const handleStatusClick = (e: MouseEvent) => {

    e.stopPropagation()

    if (task.status !== 'completed') onToggleComplete()

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

            <BonsaiTaskStatusButton status={task.status} onClick={handleStatusClick} />

          </div>

          <div className="min-w-0 flex-1 space-y-3">

            <div className="flex items-start justify-between gap-2">

              <h3

                className={`font-semibold leading-tight text-on-surface ${isCompleted ? 'line-through opacity-50' : ''}`}

              >

                {task.title}

              </h3>

              {showFlag ? (

                <MaterialIcon

                  name="flag"

                  className={`shrink-0 text-xl ${getPriorityFlagColorClass(task.priority)}`}

                />

              ) : null}

            </div>

            <TaskRowMetadataStrip

              task={task}

              enrichment={enrichment}

              showChecklistAsSubtasks

              compact

              primaryTagName={primaryTag?.name ?? null}

            />

            {dateDisplay ? (

              <div className={`flex items-center gap-1 text-[12px] font-medium ${dateColorClass}`}>

                <MaterialIcon name="calendar_today" className="text-[16px]" />

                <span>{dateDisplay}</span>

                {isRecurring ? (

                  <MaterialIcon name="sync" className="text-[14px]" aria-hidden />

                ) : null}

              </div>

            ) : null}

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

              <button

                ref={tagButtonRef}

                type="button"

                onClick={(e) => {

                  e.stopPropagation()

                  setTagModalOpen(true)

                }}

                className="shrink-0 rounded border border-dashed border-outline-variant px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-outline/60 transition-colors hover:border-primary hover:text-primary"

              >

                Add Tag

              </button>

            )}

          </div>

          <TaskRowMetadataStrip task={task} enrichment={enrichment} showChecklistAsSubtasks />

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

          {showFlag ? (

            <MaterialIcon

              name="flag"

              className={`text-[18px] ${getPriorityFlagColorClass(task.priority)}`}

            />

          ) : null}

        </div>

      </div>



      {tagModal}

    </>

  )

}


