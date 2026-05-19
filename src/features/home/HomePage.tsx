/* Home page: Dashboard bento layout with greeting, briefing card, and widgets */

import { useState, useCallback, useEffect } from 'react'
import { consumeQuickAddIntent } from '../layout/quickAddIntent'
import type { NavigationSection } from '../layout/hooks/useNavigation'
import { useTasks } from '../tasks/hooks/useTasks'
import { useInbox } from './hooks/useInbox'
import { HomeGreeting } from './components/HomeGreeting'
import { MorningBriefingCard } from './components/MorningBriefingCard'
import { UpcomingTasksWidget } from './components/UpcomingTasksWidget'
import { InboxWidget } from './components/InboxWidget'
import { HabitsWidget } from './components/HabitsWidget'
import { GoalsWidget } from './components/GoalsWidget'
import { InspirationWidget } from './components/InspirationWidget'
import { AddEditTaskModal } from '../tasks/AddEditTaskModal'
import type { Task } from '../tasks/types'
import type { InboxItem } from './types'

export interface HomePageProps {
  /** Navigate to another section (e.g. tasks, briefings) */
  onNavigate?: (section: NavigationSection) => void
}

/**
 * Home dashboard: greeting, morning briefing CTA, and fixed bento widget grid.
 */
export function HomePage({ onNavigate }: HomePageProps) {
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
  const {
    items: inboxItems,
    loading: inboxLoading,
    error: inboxError,
    addItem: addInboxItem,
    deleteItem: deleteInboxItem,
  } = useInbox()

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

  /* Mobile quick add: focus inbox capture when opened from nav */
  useEffect(() => {
    const intent = consumeQuickAddIntent()
    if (intent === 'inbox') {
      requestAnimationFrame(() => {
        document.getElementById('inbox-quick-capture-input')?.focus()
      })
    }
  }, [openAdd])

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

  const handleToggleComplete = useCallback(
    (taskId: string) => {
      void toggleComplete(taskId, true)
    },
    [toggleComplete],
  )

  return (
    <div className="mx-auto min-h-full w-full max-w-[1200px] py-6 md:py-10">
      <HomeGreeting />

      <MorningBriefingCard
        onStartMorningBriefing={() => onNavigate?.('briefings')}
        onStartWeeklyBriefing={() => onNavigate?.('weekly-briefing')}
      />

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <UpcomingTasksWidget
            onAddTask={openAdd}
            onOpenEditTask={openEdit}
            onToggleComplete={handleToggleComplete}
          />
        </div>
        <div className="md:col-span-5">
          <InboxWidget
            items={inboxItems}
            loading={inboxLoading}
            error={inboxError}
            onAddItem={addInboxItem}
            onDeleteItem={deleteInboxItem}
            onConvertToTask={openConvertToTask}
          />
        </div>
        <div className="md:col-span-6">
          <HabitsWidget onViewAll={() => onNavigate?.('habits')} />
        </div>
        <div className="md:col-span-6">
          <GoalsWidget onViewAll={() => onNavigate?.('goals')} />
        </div>
        <div className="md:col-span-12">
          <InspirationWidget />
        </div>
      </div>

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
