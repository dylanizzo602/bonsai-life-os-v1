/* BacklogAddPanel: Search and add backlog tasks to Today's Lineup */

import { useMemo, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { Task } from '../../tasks/types'
import { taskDateToComparableMs } from '../../tasks/utils/date'
import { getDueDateColorClass, getLineupDateDisplay } from '../../tasks/utils/taskRowDisplay'

interface BacklogAddPanelProps {
  candidates: Task[]
  onAddToLineUp: (taskId: string) => void
}

/** Client-side title/description search */
function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    (task.title ?? '').toLowerCase().includes(q) ||
    (task.description ?? '').toLowerCase().includes(q)
  )
}

/** Sort backlog candidates by due date (soonest first; no due date last). */
function sortByDueDate(tasks: Task[], timeZone: string): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = taskDateToComparableMs(a.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
    const bDue = taskDateToComparableMs(b.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
    return aDue - bDue
  })
}

/**
 * Searchable backlog list for adding tasks to Today's Lineup.
 */
export function BacklogAddPanel({ candidates, onAddToLineUp }: BacklogAddPanelProps) {
  const timeZone = useUserTimeZone()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const list = sortByDueDate(candidates.filter((t) => matchesSearch(t, query)), timeZone)
    return list.slice(0, 10)
  }, [candidates, query, timeZone])

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="text-secondary mb-4 text-xs font-bold uppercase tracking-widest text-outline">
        Add more tasks
      </h3>
      <div className="relative">
        <MaterialIcon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your backlog..."
          className="text-body w-full rounded-lg border-none bg-surface-container-lowest py-3 pl-10 pr-4 text-sm transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-secondary text-sm text-on-surface-variant">No matching tasks</p>
        ) : (
          filtered.map((task) => {
            const dateDisplay = getLineupDateDisplay(task, timeZone)
            const dateColorClass = getDueDateColorClass(task.due_date, timeZone)
            const isRecurring = Boolean(task.recurrence_pattern)

            return (
            <button
              key={task.id}
              type="button"
              onClick={() => onAddToLineUp(task.id)}
              className="group flex w-full items-center justify-between gap-3 rounded-lg bg-surface-container-low/50 p-3 text-left transition-colors hover:bg-surface-container-high"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MaterialIcon
                  name="add_circle"
                  className="shrink-0 text-outline group-hover:text-primary"
                />
                <span className="text-body truncate text-sm text-on-surface-variant">{task.title}</span>
              </div>
              {dateDisplay ? (
                <div
                  className={`flex shrink-0 items-center gap-0.5 text-[10px] font-medium leading-tight ${dateColorClass}`}
                >
                  <MaterialIcon name="calendar_today" className="text-[11px]" />
                  {dateDisplay}
                  {isRecurring ? (
                    <MaterialIcon name="sync" className="text-[10px]" aria-hidden />
                  ) : null}
                </div>
              ) : null}
            </button>
            )
          })
        )}
      </div>
    </div>
  )
}
