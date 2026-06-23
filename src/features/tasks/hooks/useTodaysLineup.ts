/* useTodaysLineup: Shared Today's Lineup state, daily seed, and partition for Tasks + Briefing */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  hasLineupSeedRunToday,
  loadLineupExcludedTaskIds,
  loadTodaysLineupTaskIds,
  markLineupSeedRunToday,
  saveTodaysLineupState,
} from '../../../lib/todaysLineup'
import {
  buildTodaysLineupSeedTasks,
  partitionBonsaiSections,
} from '../utils/partitionBonsaiTasks'
import type { Task } from '../types'

interface UseTodaysLineupOptions {
  tasks: Task[]
  blockedTaskIds: Set<string>
  /** True after blocked-task dependency fetch has finished at least once */
  blockedTaskIdsResolved: boolean
  timeZone: string
  /** Persist picks to localStorage (false in briefing preview mode) */
  persist?: boolean
  /** Run the once-per-day auto-seed when eligible */
  enableSeed?: boolean
}

/**
 * Shared Today's Lineup: persisted IDs, exclusions, daily seed, and partition
 * matching the Tasks section display rules.
 */
export function useTodaysLineup({
  tasks,
  blockedTaskIds,
  blockedTaskIdsResolved,
  timeZone,
  persist = true,
  enableSeed = true,
}: UseTodaysLineupOptions) {
  const [lineUpTaskIds, setLineUpTaskIds] = useState<Set<string>>(new Set())
  const [lineupExcludedTaskIds, setLineupExcludedTaskIds] = useState<Set<string>>(new Set())

  /* Load persisted lineup from localStorage on mount */
  useEffect(() => {
    if (!persist) {
      setLineUpTaskIds(new Set())
      setLineupExcludedTaskIds(new Set())
      return
    }
    setLineUpTaskIds(loadTodaysLineupTaskIds())
    setLineupExcludedTaskIds(loadLineupExcludedTaskIds())
  }, [persist])

  /* Sync from storage when the tab regains focus (e.g. after another route wrote lineup) */
  useEffect(() => {
    if (!persist) return
    const syncFromStorage = () => {
      setLineUpTaskIds(loadTodaysLineupTaskIds())
      setLineupExcludedTaskIds(loadLineupExcludedTaskIds())
    }
    window.addEventListener('focus', syncFromStorage)
    return () => window.removeEventListener('focus', syncFromStorage)
  }, [persist])

  const persistLineupState = useCallback(
    (ids: Set<string>, excluded: Set<string>) => {
      if (persist) saveTodaysLineupState(ids, excluded)
      setLineUpTaskIds(ids)
      setLineupExcludedTaskIds(excluded)
    },
    [persist],
  )

  /* Daily seed: wait for dependency resolution so seeded tasks match Tasks section rules */
  useEffect(() => {
    if (!enableSeed || !persist) return
    if (tasks.length === 0 || !blockedTaskIdsResolved) return
    if (hasLineupSeedRunToday()) return

    const seedTasks = buildTodaysLineupSeedTasks(tasks, blockedTaskIds, timeZone, 5)
    markLineupSeedRunToday()
    if (seedTasks.length === 0) return

    const mergedIds = new Set([
      ...loadTodaysLineupTaskIds(),
      ...seedTasks.map((t) => t.id),
    ])
    persistLineupState(mergedIds, loadLineupExcludedTaskIds())
  }, [
    blockedTaskIds,
    blockedTaskIdsResolved,
    enableSeed,
    persist,
    persistLineupState,
    tasks,
    timeZone,
  ])

  const addToLineUp = useCallback(
    (id: string) => {
      const nextIds = new Set(lineUpTaskIds)
      nextIds.add(id)
      const nextExcluded = new Set(lineupExcludedTaskIds)
      nextExcluded.delete(id)
      persistLineupState(nextIds, nextExcluded)
    },
    [lineUpTaskIds, lineupExcludedTaskIds, persistLineupState],
  )

  const removeFromLineUp = useCallback(
    (id: string) => {
      const nextIds = new Set(lineUpTaskIds)
      nextIds.delete(id)
      const nextExcluded = new Set(lineupExcludedTaskIds)
      nextExcluded.add(id)
      persistLineupState(nextIds, nextExcluded)
    },
    [lineUpTaskIds, lineupExcludedTaskIds, persistLineupState],
  )

  /* Partition: same lineup/backlog rules as TasksPage */
  const { lineupTasks, backlogPool, lineupIds } = useMemo(
    () =>
      partitionBonsaiSections(
        tasks,
        blockedTaskIds,
        timeZone,
        '',
        lineUpTaskIds,
        lineupExcludedTaskIds,
      ),
    [tasks, blockedTaskIds, timeZone, lineUpTaskIds, lineupExcludedTaskIds],
  )

  return {
    lineUpTaskIds,
    lineupExcludedTaskIds,
    lineupTasks,
    lineupIds,
    backlogPool,
    addToLineUp,
    removeFromLineUp,
  }
}
