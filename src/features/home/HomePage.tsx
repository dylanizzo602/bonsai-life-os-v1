/* Home page: Dashboard with widgets; greeting, morning briefing banner, lineup, inbox, upcoming tasks, habits, goals, reflections, misc */

import { useState, useCallback } from 'react'
import type { NavigationSection } from '../layout/hooks/useNavigation'
import { useMorningBriefingBanner } from './hooks/useMorningBriefingBanner'
import { useHomeWidgetConfig, type HomeWidgetId } from './hooks/useHomeWidgetConfig'
import { useTasks } from '../tasks/hooks/useTasks'
import { useInbox } from './hooks/useInbox'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import { LineUpWidget } from './components/LineUpWidget'
import { InboxWidget } from './components/InboxWidget'
import { UpcomingTasksWidget } from './components/UpcomingTasksWidget'
import { HabitsWidget } from './components/HabitsWidget'
import { GoalsWidget } from './components/GoalsWidget'
import { ReflectionsWidget } from './components/ReflectionsWidget'
import { MiscWidget } from './components/MiscWidget'
import { Button } from '../../components/Button'
import type { Task } from '../tasks/types'
import type { InboxItem } from './types'

const WIDGET_LABELS: Record<HomeWidgetId, string> = {
  lineup: 'Line Up',
  inbox: 'Inbox',
  habits: 'Habits',
  reflections: 'Reflections',
  upcoming: 'Upcoming Tasks',
  goals: 'Goals',
  misc: 'Misc',
}

export interface HomePageProps {
  /** Navigate to another section (e.g. tasks, briefings, reflections) */
  onNavigate?: (section: NavigationSection) => void
}

/**
 * Home page component.
 * Dashboard with greeting, morning briefing banner, and widget grid (line up, inbox, upcoming tasks, habits, goals, reflections, misc).
 */
export function HomePage({ onNavigate }: HomePageProps) {
  const { showBanner, dismiss } = useMorningBriefingBanner()
  const { order, hidden, toggleHidden, moveUp, moveDown } = useHomeWidgetConfig()
  const {
    tasks,
    createTask,
    updateTask,
    refetch: refetchTasks,
    fetchSubtasks,
    createSubtask,
    deleteTask,
    toggleComplete,
    getTasks,
    getTaskDependencies,
    onAddDependency,
    onRemoveDependency,
  } = useTasks()
  const {
    items: inboxItems,
    loading: inboxLoading,
    error: inboxError,
    addItem: addInboxItem,
    deleteItem: deleteInboxItem,
  } = useInbox()

  /* Customize widgets: show move up/down and hide controls */
  const [isCustomizing, setIsCustomizing] = useState(false)

  /* Task modal state: edit task, or add with optional initial title (from inbox) */
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [initialTitle, setInitialTitle] = useState<string>('')
  const [inboxItemToRemoveOnCreate, setInboxItemToRemoveOnCreate] = useState<InboxItem | null>(null)

  const openAdd = useCallback(() => {
    setEditTask(null)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((task: Task) => {
    setEditTask(task)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
    setModalOpen(true)
  }, [])

  const openConvertToTask = useCallback((item: InboxItem) => {
    setEditTask(null)
    setInitialTitle(item.name)
    setInboxItemToRemoveOnCreate(item)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditTask(null)
    setInitialTitle('')
    setInboxItemToRemoveOnCreate(null)
  }, [])

  const handleCreateTask = useCallback(
    async (input: Parameters<typeof createTask>[0]) => {
      const created = await createTask(input)
      if (inboxItemToRemoveOnCreate) {
        await deleteInboxItem(inboxItemToRemoveOnCreate.id)
        setInboxItemToRemoveOnCreate(null)
      }
      refetchTasks()
      closeModal()
      return created
    },
    [createTask, inboxItemToRemoveOnCreate, deleteInboxItem, refetchTasks, closeModal],
  )

  const handleAddToLineup = useCallback(() => {
    onNavigate?.('tasks')
  }, [onNavigate])

  return (
    <div className="min-h-full">
      {/* Header: Greeting, optional morning briefing banner, and customize widgets */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Welcome.</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isCustomizing ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setIsCustomizing((v) => !v)}
          >
            {isCustomizing ? 'Done' : 'Customize widgets'}
          </Button>
          {showBanner && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-4 py-3 md:justify-end">
            <p className="text-body text-bonsai-slate-700">
              Looks like you didn&apos;t finish your morning briefing.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onNavigate?.('briefings')}
              >
                Review morning briefing &gt;
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
                Dismiss
              </Button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Widget grid: order and visibility from useHomeWidgetConfig */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {order
          .filter((id) => !hidden.has(id))
          .map((id, index) => {
            const isLineup = id === 'lineup'
            const colSpan = isLineup ? 'lg:col-span-2' : ''
            const visibleOrder = order.filter((i) => !hidden.has(i))
            return (
              <div key={id} className={`${colSpan} flex flex-col gap-1`}>
                {isCustomizing && (
                  <div className="flex flex-wrap items-center gap-2 rounded border border-bonsai-slate-200 bg-bonsai-slate-50 px-2 py-1.5 text-secondary text-bonsai-slate-600">
                    <span className="font-medium">{WIDGET_LABELS[id]}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveUp(id)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveDown(id)}
                      disabled={index === visibleOrder.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHidden(id)}
                      aria-label="Hide widget"
                    >
                      Hide
                    </Button>
                  </div>
                )}
                {id === 'lineup' && (
                  <LineUpWidget
                    tasks={tasks}
                    onOpenEditTask={openEdit}
                    onOpenAddToLineup={handleAddToLineup}
                  />
                )}
                {id === 'inbox' && (
                  <InboxWidget
                    items={inboxItems}
                    loading={inboxLoading}
                    error={inboxError}
                    onAddItem={addInboxItem}
                    onDeleteItem={deleteInboxItem}
                    onConvertToTask={openConvertToTask}
                  />
                )}
                {id === 'habits' && <HabitsWidget onViewAll={() => onNavigate?.('habits')} />}
                {id === 'reflections' && (
                  <ReflectionsWidget onReadEntry={() => onNavigate?.('reflections')} />
                )}
                {id === 'upcoming' && (
                  <UpcomingTasksWidget
                    onViewAll={() => onNavigate?.('tasks')}
                    onAddTask={openAdd}
                    onOpenEditTask={openEdit}
                  />
                )}
                {id === 'goals' && <GoalsWidget onViewAll={() => onNavigate?.('goals')} />}
                {id === 'misc' && <MiscWidget />}
              </div>
            )
          })}
      </div>

      {/* Hidden widgets: show in customize mode so user can restore */}
      {isCustomizing && [...hidden].length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-bonsai-slate-300 bg-bonsai-slate-50 p-3">
          <p className="text-secondary font-medium text-bonsai-slate-600 mb-2">Hidden widgets</p>
          <div className="flex flex-wrap gap-2">
            {[...hidden].map((id) => (
              <Button
                key={id}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => toggleHidden(id)}
              >
                Show {WIDGET_LABELS[id]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit task modal (shared by lineup, upcoming, inbox convert) */}
      <AddEditTaskModal
        isOpen={modalOpen}
        onClose={closeModal}
        task={editTask}
        initialTitle={initialTitle}
        onCreateTask={handleCreateTask}
        onUpdateTask={updateTask}
        fetchSubtasks={fetchSubtasks}
        createSubtask={createSubtask}
        updateTask={updateTask}
        deleteTask={deleteTask}
        toggleComplete={toggleComplete}
        getTasks={getTasks}
        getTaskDependencies={getTaskDependencies}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
      />
    </div>
  )
}
