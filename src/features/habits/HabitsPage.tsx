/* Habits page: Header, New Habit button, scrollable habit table (dates past to tomorrow, streak at end), add/edit modal */

import { useState, useEffect } from 'react'
import { AddButton } from '../../components/AddButton'
import { HabitsIcon, PlusIcon } from '../../components/icons'
import { useHabits } from './hooks/useHabits'
import { HabitTable } from './HabitTable'
import { AddEditHabitModal } from './AddEditHabitModal'
import type { HabitWithStreaks } from './types'

/**
 * Habits section: title, subtitle, New Habit button, scrollable table (endless dates in past, one day future, streak at end).
 */
export function HabitsPage() {
  const {
    habitsWithStreaks,
    entriesByHabit,
    dateRange,
    setDateRange,
    scrollableDateRange,
    todayYMD,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    cycleEntry,
  } = useHabits()

  /* Use single scrollable range: many days in the past up to one day in the future */
  useEffect(() => {
    setDateRange(scrollableDateRange)
  }, [scrollableDateRange, setDateRange])

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
          <AddButton onClick={handleOpenCreate} hideChevron>New Habit</AddButton>
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

      {/* Empty state: Card with icon, message, and Create Your First Habit CTA */}
      {!loading && habitsWithStreaks.length === 0 && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-bonsai-slate-200 bg-white p-8 shadow-sm">
            {/* Icon: Circular grey background with habits icon */}
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bonsai-slate-100">
                <HabitsIcon className="h-7 w-7 text-bonsai-slate-500" />
              </div>
            </div>
            {/* Heading */}
            <h2 className="mt-4 text-center text-body font-semibold text-bonsai-brown-700">
              No habits yet
            </h2>
            {/* Description */}
            <p className="mt-2 text-center text-body text-bonsai-slate-600">
              Start building consistency by creating your first habit tracker.
            </p>
            {/* CTA: Black pill button with plus and label */}
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

      {/* Table: full bleed to content edges (no horizontal padding between table and viewport) */}
      {!loading && habitsWithStreaks.length > 0 && (
        <div className="-mx-4 md:-mx-6">
          <HabitTable
            habits={habitsWithStreaks}
            entriesByHabit={entriesByHabit}
            dateRange={dateRange}
            todayYMD={todayYMD}
            onCycleEntry={cycleEntry}
            onEditHabit={handleEditHabit}
          />
        </div>
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
