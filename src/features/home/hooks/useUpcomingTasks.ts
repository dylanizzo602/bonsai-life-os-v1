/* useUpcomingTasks: First 5 "available" tasks (same logic as Tasks page Available view) */

import { useState, useEffect, useMemo } from 'react'
import { useTasks } from '../../tasks/hooks/useTasks'
import { getDependenciesForTaskIds } from '../../../lib/supabase/tasks'
import type { Task } from '../../tasks/types'

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

/**
 * Returns the first 5 available tasks (incomplete, not blocked, start <= now), sorted like Tasks page Available view.
 */
export function useUpcomingTasks(): Task[] {
  const { tasks } = useTasks()
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set())

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
    const nowMs = Date.now()
    const available = tasks.filter((t) => {
      if (t.status === 'archived' || t.status === 'deleted' || t.status === 'completed') return false
      if (blockedTaskIds.has(t.id)) return false
      if (t.start_date != null && new Date(t.start_date).getTime() > nowMs) return false
      return true
    })
    const sorted = [...available].sort((a, b) => {
      const aUrgent = a.priority === 'urgent' ? 1 : 0
      const bUrgent = b.priority === 'urgent' ? 1 : 0
      if (bUrgent !== aUrgent) return bUrgent - aUrgent
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      if (aDue !== bDue) return aDue - bDue
      const aPri = PRIORITY_ORDER[a.priority] ?? 0
      const bPri = PRIORITY_ORDER[b.priority] ?? 0
      if (bPri !== aPri) return bPri - aPri
      const statusOrder = (s: Task['status']) => (s === 'in_progress' ? 1 : s === 'active' ? 0 : -1)
      return statusOrder(b.status) - statusOrder(a.status)
    })
    return sorted.slice(0, 5)
  }, [tasks, blockedTaskIds])
}
