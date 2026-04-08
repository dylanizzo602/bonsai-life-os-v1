/* Shared viewport hook and layout resolution for TaskListItem */

import { useEffect, useState } from 'react'
import type { TaskListItemLayoutMode, TaskListItemVisualLayout } from './taskListItemTypes'

/** Viewport bucket aligned with Tailwind `md` (768px) and `lg` (1024px) */
export type TaskListViewport = 'mobile' | 'tablet' | 'desktop'

/**
 * Tracks current task-list breakpoints so one TaskListItem can switch layout without duplicating list markup.
 * Defaults to `desktop` on the server/first paint to match typical SSR hydration for wide layouts.
 */
export function useTaskListLayout(): TaskListViewport {
  const [viewport, setViewport] = useState<TaskListViewport>(() => {
    if (typeof window === 'undefined') return 'desktop'
    const w = window.innerWidth
    if (w >= 1024) return 'desktop'
    if (w >= 768) return 'tablet'
    return 'mobile'
  })

  /* Subscribe to min-width media queries matching Tailwind md / lg */
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return
    const mqLg = window.matchMedia('(min-width: 1024px)')
    const mqMd = window.matchMedia('(min-width: 768px)')
    const sync = () => {
      if (mqLg.matches) setViewport('desktop')
      else if (mqMd.matches) setViewport('tablet')
      else setViewport('mobile')
    }
    sync()
    mqLg.addEventListener('change', sync)
    mqMd.addEventListener('change', sync)
    return () => {
      mqLg.removeEventListener('change', sync)
      mqMd.removeEventListener('change', sync)
    }
  }, [])

  return viewport
}

/**
 * Maps user-facing layout mode + viewport to a concrete visual layout (which JSX subtree to render).
 */
export function resolveTaskListVisualLayout(
  mode: TaskListItemLayoutMode,
  viewport: TaskListViewport,
): TaskListItemVisualLayout {
  if (mode === 'compact') return 'compact'
  if (mode === 'tablet') return 'tablet'
  if (mode === 'full') return 'full'
  /* responsive */
  if (viewport === 'desktop') return 'full'
  if (viewport === 'tablet') return 'tablet'
  return 'compact'
}
