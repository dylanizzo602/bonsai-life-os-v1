/* Habits page: Header, New Habit button, date range (desktop), habit table, legend, add/edit modal */

import { useState, useEffect } from 'react'
import { AddButton } from '../../components/AddButton'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'
import { useViewportWidth } from '../../hooks/useViewportWidth'
import { useHabits } from './hooks/useHabits'
import { HabitTable } from './HabitTable'
import { AddEditHabitModal } from './AddEditHabitModal'
import type { HabitWithStreaks } from './types'

const LG_BREAKPOINT = 1024

/** Format date range for display: "Feb 8 - Feb 14, 2026" */
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
  return `${startStr} - ${endStr}${yearStr}`
}

/**
 * Habits section: title, subtitle, New Habit button, calendar table (week on desktop, 3 days on mobile), legend.
 */
export function HabitsPage() {
  const width = useViewportWidth()
  const isDesktop = width >= LG_BREAKPOINT
  const {
    habitsWithStreaks,
    entriesByHabit,
    dateRange,
    setDateRange,
    setWeekToToday,
    todayYMD,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    cycleEntry,
    goToPrevWeek,
    goToNextWeek,
    nextThreeDaysRange,
  } = useHabits()

  /* Sync date range with viewport: desktop = week with nav, mobile = always today + 2 days */
  useEffect(() => {
    if (isDesktop) {
      setWeekToToday()
    } else {
      setDateRange(nextThreeDaysRange())
    }
  }, [isDesktop])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStreaks | null>(null)

  const handleOpenCreate = () => {
    setEditingHabit(null)
    setModalOpen(true)
  }

  const handleEditHabit = (habit: HabitWithStreaks) => {
    setEditingHabit(habit)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingHabit(null)
  }

  return (
    <div className="min-h-full">
      {/* Header: title and subtitle on left, New Habit button on right */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4 mb-6">
        <div>
          <h1 className="text-page-title font-bold text-bonsai-brown-700">Habits</h1>
          <p className="text-secondary text-bonsai-slate-600 mt-1">
            Track your daily routines and watch your consistency grow. Small habits, compounded over
            time, create lasting change.
          </p>
        </div>
        <div className="shrink-0">
          <AddButton onClick={handleOpenCreate}>New Habit</AddButton>
        </div>
      </div>


      {/* Loading and error states */}
      {loading && (
        <p className="text-body text-bonsai-slate-500 py-8">Loading habits…</p>
      )}
      {error && (
        <p className="text-body text-red-600 py-2" role="alert">
          {error}
        </p>
      )}

      {/* Habit table or empty state */}
      {!loading && habitsWithStreaks.length === 0 && (
        <p className="text-body text-bonsai-slate-500 py-8">
          No habits yet. Add one to get started.
        </p>
      )}
      {!loading && habitsWithStreaks.length > 0 && (
        <>
          <HabitTable
            habits={habitsWithStreaks}
            entriesByHabit={entriesByHabit}
            dateRange={dateRange}
            todayYMD={todayYMD}
            onCycleEntry={cycleEntry}
            onEditHabit={handleEditHabit}
            isDesktop={isDesktop}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            dateRangeText={formatDateRange(dateRange.start, dateRange.end)}
          />

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-secondary text-bonsai-slate-600">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-white border border-bonsai-slate-300" />
              Empty
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-orange-500" />
              Complete
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 relative">
                <span className="absolute inset-0 bg-white" />
                <span className="absolute inset-0 bg-orange-500" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }} />
              </span>
              Skipped
            </span>
          </div>
        </>
      )}

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
