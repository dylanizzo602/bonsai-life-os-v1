/* Home page: Dashboard with widgets; greeting, morning briefing banner, lineup, inbox, upcoming tasks, habits, goals, reflections, misc */

import { useState, useCallback } from 'react'
import type { NavigationSection } from '../layout/hooks/useNavigation'
import { useMorningBriefingBanner } from './hooks/useMorningBriefingBanner'
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
  const {
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
  const { deleteItem: deleteInboxItem } = useInbox()

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
      {/* Header: Greeting and optional morning briefing banner */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Welcome.</h1>
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

      {/* Widget grid: Line Up full width, then two columns on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Line Up: full width on all breakpoints (spans both columns on lg) */}
        <div className="lg:col-span-2">
          <LineUpWidget
            onOpenEditTask={openEdit}
            onOpenAddToLineup={handleAddToLineup}
          />
        </div>

        {/* Left column: Inbox, Habits, Reflections */}
        <div className="flex flex-col gap-4">
          <InboxWidget onConvertToTask={openConvertToTask} />
          <HabitsWidget onViewAll={() => onNavigate?.('habits')} />
          <ReflectionsWidget onReadEntry={() => onNavigate?.('reflections')} />
        </div>

        {/* Right column: Upcoming Tasks, Goals, Misc */}
        <div className="flex flex-col gap-4">
          <UpcomingTasksWidget
            onViewAll={() => onNavigate?.('tasks')}
            onAddTask={openAdd}
            onOpenEditTask={openEdit}
          />
          <GoalsWidget onViewAll={() => onNavigate?.('goals')} />
          <MiscWidget />
        </div>
      </div>

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
