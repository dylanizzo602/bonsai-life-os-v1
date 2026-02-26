/* Habits page: Tabs (Habits | Habits 1.1 | Habits 1.2), header, New Habit button, table/list per view, add/edit modal */

import { useState, useEffect } from 'react'
import { AddButton } from '../../components/AddButton'
import { HabitsIcon, PlusIcon } from '../../components/icons'
import { useViewportWidth } from '../../hooks/useViewportWidth'
import { useHabits } from './hooks/useHabits'
import { HabitTable } from './HabitTable'
import { HabitTableV1 } from './HabitTableV1'
import { HabitListV2 } from './HabitListV2'
import { AddEditHabitModal } from './AddEditHabitModal'
import type { HabitWithStreaks, HabitWithStreaksV1, HabitWithStreaksV2 } from './types'

type HabitsTab = '1.0' | '1.1' | '1.2'

const LG_BREAKPOINT = 1024

/** Format date range for display: "Feb 15 – Feb 21, 2026" */
function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const sameYear = s.getFullYear() === e.getFullYear()
  const startStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = e.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
  const yearStr = sameYear ? `, ${s.getFullYear()}` : ''
  return `${startStr} – ${endStr}${yearStr}`
}

/**
 * Habits section: desktop = week view with prev/next arrows; mobile = scrollable range starting at today.
 */
export function HabitsPage() {
  const width = useViewportWidth()
  const isDesktop = width >= LG_BREAKPOINT
  const {
    habitsWithStreaks,
    habitsWithStreaksV1,
    habitsWithStreaksV2,
    entriesByHabit,
    dateRange,
    setDateRange,
    sevenDaysRange,
    setWeekToToday,
    todayYMD,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    setEntry,
    cycleEntry,
    cycleEntryV1,
    goToPrevWeek,
    goToNextWeek,
    goToPrevRange,
    goToNextRange,
  } = useHabits()

  /* Desktop: current week + arrow nav; mobile/tablet: max 7 dates at a time + arrow nav */
  useEffect(() => {
    if (isDesktop) {
      setWeekToToday()
    } else {
      setDateRange(sevenDaysRange)
    }
  }, [isDesktop, setWeekToToday, setDateRange, sevenDaysRange])

  const [activeTab, setActiveTab] = useState<HabitsTab>('1.0')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStreaks | HabitWithStreaksV1 | HabitWithStreaksV2 | null>(null)

  const handleOpenCreate = () => {
    setEditingHabit(null)
    setModalOpen(true)
  }

  const handleEditHabit = (habit: HabitWithStreaks | HabitWithStreaksV1 | HabitWithStreaksV2) => {
    setEditingHabit(habit)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingHabit(null)
  }

  const hasHabits = habitsWithStreaks.length > 0

  return (
    <div className="min-h-full overflow-x-hidden">
      {/* Header: title, description, tabs, and New Habit button */}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-page-title font-bold text-bonsai-brown-700">Habits</h1>
          <p className="text-secondary text-bonsai-slate-600 mt-1">
            {activeTab === '1.0' &&
              'Track your daily routines and watch your consistency grow. Small habits, compounded over time, create lasting change.'}
            {activeTab === '1.1' &&
              'Weighted streak: green = 1, yellow = 0.1, red = 0.'}
            {activeTab === '1.2' &&
              'Simple checklist: did you do it today? Consecutive days counter (only full completion counts).'}
          </p>
          {/* Tabs: Habits | Habits 1.1 | Habits 1.2 – improved tap targets on mobile */}
          {hasHabits && (
            <div className="flex flex-wrap gap-1 md:gap-2 mt-3 border-b border-bonsai-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('1.0')}
                className={`px-4 py-2.5 text-secondary font-medium border-b-2 -mb-px transition-colors touch-manipulation ${activeTab === '1.0' ? 'border-bonsai-brown-700 text-bonsai-brown-700' : 'border-transparent text-bonsai-slate-600 hover:text-bonsai-slate-800'}`}
              >
                Habits
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('1.1')}
                className={`px-4 py-2.5 text-secondary font-medium border-b-2 -mb-px transition-colors touch-manipulation ${activeTab === '1.1' ? 'border-bonsai-brown-700 text-bonsai-brown-700' : 'border-transparent text-bonsai-slate-600 hover:text-bonsai-slate-800'}`}
              >
                Habits 1.1
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('1.2')}
                className={`px-4 py-2.5 text-secondary font-medium border-b-2 -mb-px transition-colors touch-manipulation ${activeTab === '1.2' ? 'border-bonsai-brown-700 text-bonsai-brown-700' : 'border-transparent text-bonsai-slate-600 hover:text-bonsai-slate-800'}`}
              >
                Habits 1.2
              </button>
            </div>
          )}
        </div>
        <div className="shrink-0 w-full md:w-auto">
          <AddButton onClick={handleOpenCreate} hideChevron>New Habit</AddButton>
        </div>
      </header>

      {/* Loading and error states */}
      {loading && (
        <p className="text-body text-bonsai-slate-500 py-8">Loading habits…</p>
      )}
      {error && (
        <p className="text-body text-red-600 py-2" role="alert">
          {error}
        </p>
      )}

      {/* Empty state: Card with icon, message, and Create Your First Habit CTA */}
      {!loading && habitsWithStreaks.length === 0 && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-bonsai-slate-200 bg-white p-8 shadow-sm">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bonsai-slate-100">
                <HabitsIcon className="h-7 w-7 text-bonsai-slate-500" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-body font-semibold text-bonsai-brown-700">
              No habits yet
            </h2>
            <p className="mt-2 text-center text-body text-bonsai-slate-600">
              Start building consistency by creating your first habit tracker.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-body font-semibold text-white transition-colors hover:bg-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-slate-500 focus:ring-offset-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First Habit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single content wrapper: one responsive padding; children handle their own width/centering */}
      <div className="w-full p-4 md:p-6">
        {!loading && hasHabits && activeTab === '1.0' && (
          <div className="flex justify-center">
            <HabitTable
              habits={habitsWithStreaks}
              entriesByHabit={entriesByHabit}
              dateRange={dateRange}
              todayYMD={todayYMD}
              onCycleEntry={cycleEntry}
              onEditHabit={handleEditHabit}
              isDesktop={isDesktop}
              dateRangeText={formatDateRange(dateRange.start, dateRange.end)}
              onPrevRange={isDesktop ? goToPrevWeek : goToPrevRange}
              onNextRange={isDesktop ? goToNextWeek : goToNextRange}
            />
          </div>
        )}
        {!loading && hasHabits && activeTab === '1.1' && (
          <div className="flex justify-center">
            <HabitTableV1
              habits={habitsWithStreaksV1}
              entriesByHabit={entriesByHabit}
              dateRange={dateRange}
              todayYMD={todayYMD}
              onCycleEntryV1={cycleEntryV1}
              onEditHabit={handleEditHabit}
              isDesktop={isDesktop}
              dateRangeText={formatDateRange(dateRange.start, dateRange.end)}
              onPrevRange={isDesktop ? goToPrevWeek : goToPrevRange}
              onNextRange={isDesktop ? goToNextWeek : goToNextRange}
            />
          </div>
        )}
        {!loading && hasHabits && activeTab === '1.2' && (
          <div className="flex justify-center">
            <HabitListV2
              habits={habitsWithStreaksV2}
              entriesByHabit={entriesByHabit}
              todayYMD={todayYMD}
              onSetEntry={setEntry}
              onEditHabit={handleEditHabit}
            />
          </div>
        )}
      </div>

      {/* Add/Edit habit modal */}
      <AddEditHabitModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onCreateHabit={createHabit}
        onUpdateHabit={updateHabit}
        onDeleteHabit={deleteHabit}
        habit={editingHabit}
      />
    </div>
  )
}
