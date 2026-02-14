/* TaskDependenciesPopover: Popover showing Task Dependencies section, anchored to trigger (e.g. dependency icon) */

import { useEffect, useRef, useState } from 'react'
import { DependenciesSection } from '../DependenciesSection'
import type { Task, TaskDependency, CreateTaskDependencyInput } from '../types'

export interface TaskDependenciesPopoverProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Called when popover should close */
  onClose: () => void
  /** Reference to the trigger element (e.g. dependency icon button) for positioning */
  triggerRef: React.RefObject<HTMLElement | null>
  /** Current task id to show dependencies for */
  currentTaskId: string
  /** Fetch all tasks for linking and resolving dependency details */
  getTasks: () => Promise<Task[]>
  /** Fetch blocking and blocked-by dependencies */
  getTaskDependencies: (taskId: string) => Promise<{
    blocking: TaskDependency[]
    blockedBy: TaskDependency[]
  }>
  /** Create a dependency link */
  onAddDependency: (input: CreateTaskDependencyInput) => Promise<void>
  /** Remove a dependency by id (optional) */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** Called when dependencies change (e.g. to refetch enrichment on parent list) */
  onDependenciesChanged?: () => void
}

/**
 * Popover that displays the Task Dependencies section.
 * Positioned relative to the trigger element; closes on click outside.
 * Separate from the edit task modal - can be opened by clicking dependency icons on task rows.
 */
export function TaskDependenciesPopover({
  isOpen,
  onClose,
  triggerRef,
  currentTaskId,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onDependenciesChanged,
}: TaskDependenciesPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  /* Position: center on mobile/tablet (< 1024px); below trigger on desktop */
  const DESKTOP_BREAKPOINT = 1024

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return

    const calculatePosition = () => {
      if (!popoverRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      let top: number
      let left: number
      if (viewportWidth < DESKTOP_BREAKPOINT) {
        top = Math.max(padding, (viewportHeight - popoverRect.height) / 2)
        left = Math.max(padding, (viewportWidth - popoverRect.width) / 2)
      } else {
        if (!triggerRef.current) return
        const triggerRect = triggerRef.current.getBoundingClientRect()
        top = triggerRect.bottom + 8
        left = triggerRect.left
        if (left + popoverRect.width > viewportWidth - padding) left = viewportWidth - popoverRect.width - padding
        if (left < padding) left = padding
        if (top + popoverRect.height > viewportHeight - padding) top = triggerRect.top - popoverRect.height - 8
        if (top < padding) top = padding
      }
      setPosition({ top, left })
    }

    const timeoutId = setTimeout(calculatePosition, 0)
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, triggerRef])

  /* Close popover when clicking outside */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] max-h-[calc(100vh-16px)] overflow-hidden w-full max-w-md rounded-lg border border-bonsai-slate-200 bg-white shadow-lg flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="dialog"
      aria-label="Task dependencies"
      /* Stop propagation so clicks inside (e.g. search input) do not bubble to the task row and open the edit modal */
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Popover header: Title */}
      <div className="border-b border-bonsai-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-bonsai-slate-800">Task Dependencies</h3>
      </div>
      {/* Popover body: Dependencies section; fills remaining height and scrolls within viewport */}
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <DependenciesSection
          currentTaskId={currentTaskId}
          getTasks={getTasks}
          getTaskDependencies={getTaskDependencies}
          onAddDependency={async (input) => {
            await onAddDependency(input)
            onDependenciesChanged?.()
          }}
          onRemoveDependency={
            onRemoveDependency
              ? async (id) => {
                  await onRemoveDependency(id)
                  onDependenciesChanged?.()
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}
