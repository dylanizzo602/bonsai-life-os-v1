/* useUpcomingTasks: Next 5 due tasks (due date required), sorted soonest-first */

import { useState, useEffect, useMemo } from 'react'
import { useTasks } from '../../tasks/hooks/useTasks'
import { getDependenciesForTaskIds } from '../../../lib/supabase/tasks'
import type { Task } from '../../tasks/types'
import { computeBlockedTaskIds } from '../../tasks/utils/dependencies'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import { taskDateToComparableMs } from '../../tasks/utils/date'

/**
 * Returns the next 5 tasks with due dates (incomplete), sorted by nearest due date first.
 * Excludes habit-linked reminder tasks so the home widget shows only "real" tasks.
 */
export function useUpcomingTasks(): Task[] {
  const { tasks } = useTasks()
  const timeZone = useUserTimeZone()
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set())

  /* Parent status lookup: used to hide subtasks whose parent is in Archive/Trash (prevents leaking into widgets). */
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks])

  /* Fetch dependency data to compute blocked task ids */
  useEffect(() => {
    if (tasks.length === 0) {
      setBlockedTaskIds(new Set())
      return
    }
    const taskIds = tasks.map((t) => t.id)
    const taskLookup = Object.fromEntries(tasks.map((t) => [t.id, t]))
    getDependenciesForTaskIds(taskIds)
      .then((deps) => {
        setBlockedTaskIds(computeBlockedTaskIds(deps, taskLookup))
      })
      .catch(() => setBlockedTaskIds(new Set()))
  }, [tasks])

  return useMemo(() => {
    /* Base filter: hide subtasks whose parent is archived/deleted so widget matches TasksPage behavior. */
    const withoutArchivedOrDeletedParents = tasks.filter((t) => {
      if (!t.parent_id) return true
      const parent = taskById.get(t.parent_id)
      return parent?.status !== 'deleted' && parent?.status !== 'archived'
    })

    /* Base pool: hide completed/archived/deleted and require a due date */
    const dueOnly = withoutArchivedOrDeletedParents.filter((t) => {
      if (t.status === 'completed' || t.status === 'archived' || t.status === 'deleted') return false
      if (t.habit_id) return false
      return taskDateToComparableMs(t.due_date, timeZone) != null
    })

    /* Sort: nearest due first (timezone-safe for date-only dues) */
    const sortedByDue = [...dueOnly].sort((a, b) => {
      const aDue = taskDateToComparableMs(a.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
      const bDue = taskDateToComparableMs(b.due_date, timeZone) ?? Number.MAX_SAFE_INTEGER
      if (aDue !== bDue) return aDue - bDue
      return (a.title ?? '').localeCompare(b.title ?? '')
    })

    /* Truncate: keep widget compact */
    return sortedByDue.slice(0, 5)
  }, [tasks, taskById, blockedTaskIds, timeZone])
}
