/* useUpcomingTasks: First 5 "available" non-habit tasks (same logic as Tasks page Available view) */

import { useState, useEffect, useMemo } from 'react'
import { useTasks } from '../../tasks/hooks/useTasks'
import { getDependenciesForTaskIds } from '../../../lib/supabase/tasks'
import type { Task } from '../../tasks/types'
import { getAvailableTasksFromList } from '../../tasks/utils/available'
import { useUserTimeZone } from '../../settings/useUserTimeZone'

/**
 * Returns the first 5 available tasks (incomplete, not blocked, start <= now), sorted like Tasks page Available view.
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
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]))
    getDependenciesForTaskIds(taskIds)
      .then((deps) => {
        const blocked = new Set<string>()
        for (const d of deps) {
          const blocker = byId[d.blocker_id]
          if (blocker && blocker.status !== 'completed') {
            blocked.add(d.blocked_id)
          }
        }
        setBlockedTaskIds(blocked)
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

    /* Availability + sort: reuse the same Available view logic from Tasks page */
    const availableSorted = getAvailableTasksFromList(
      withoutArchivedOrDeletedParents,
      blockedTaskIds,
      timeZone,
    )
    /* Home widget filter: hide habit reminders (habit-linked tasks) */
    const nonHabit = availableSorted.filter((t) => !t.habit_id)
    /* Truncate: keep widget compact */
    return nonHabit.slice(0, 5)
  }, [tasks, taskById, blockedTaskIds, timeZone])
}
