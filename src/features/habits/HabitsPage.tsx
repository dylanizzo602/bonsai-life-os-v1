/* Habits page: Header, date picker, card grid (streak + breakdown), add/edit modal */

import { useMemo, useState } from 'react'
import { AddButton } from '../../components/AddButton'
import { HabitsIcon, PlusIcon } from '../../components/icons'
import { useHabits } from './hooks/useHabits'
import { AddEditHabitModal } from './AddEditHabitModal'
import { HabitGrid } from './HabitGrid'
import type { HabitWithStreaks } from './types'

/** Format YYYY-MM-DD for a friendly label (e.g. "Today", "Tomorrow", or "Apr 9, 2026") */
function formatSelectedDateLabel(ymd: string, todayYMD: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const today = new Date(todayYMD + 'T12:00:00')
  const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Habits section: single-day editing with a date picker and card grid */
export function HabitsPage() {
  const {
    habitsWithStreaks,
    entriesByHabit,
    setDateRange,
    todayYMD,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    setEntry,
  } = useHabits()

  /* Selected date: drive the hook's dateRange as a single day so entriesByHabit contains that day */
  const [selectedDateYMD, setSelectedDateYMD] = useState(() => todayYMD)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStreaks | null>(null)

  /* Sync selected date to "today" when the hook's today rolls over at midnight */
  const selectedLabel = useMemo(
    () => formatSelectedDateLabel(selectedDateYMD, todayYMD),
    [selectedDateYMD, todayYMD],
  )

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

  const hasHabits = habitsWithStreaks.length > 0

  /* Date picker: update selected date and load the entries for that day */
  const handleChangeSelectedDate = (ymd: string) => {
    setSelectedDateYMD(ymd)
    setDateRange({ start: ymd, end: ymd })
  }

  return (
    <div className="min-h-full overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
        {/* Header: title + primary action */}
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 py-4 md:py-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-page-title font-bold text-bonsai-brown-700">Habits</h1>
            <p className="text-secondary text-bonsai-slate-600 mt-1">
              Target and minimum actions build your streak. Daily habits count consecutive days; weekly habits count
              consecutive weeks where every chosen day is done.
            </p>
          </div>
          <div className="shrink-0 w-full md:w-auto">
            <AddButton onClick={handleOpenCreate} hideChevron>
              New Habit
            </AddButton>
          </div>
        </header>

        {/* Date controls: pick a day to edit past/future entries */}
        <div className="mb-4 rounded-xl border border-bonsai-slate-200 bg-white p-3 md:p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
              <label className="text-secondary font-medium text-bonsai-slate-700" htmlFor="habits-date">
                Date
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <input
                  id="habits-date"
                  type="date"
                  value={selectedDateYMD}
                  onChange={(e) => handleChangeSelectedDate(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border border-bonsai-slate-200 bg-white px-3 py-2 text-body text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
                />
                <span className="text-secondary text-bonsai-slate-600">{selectedLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleChangeSelectedDate(todayYMD)}
                className="w-full sm:w-auto rounded-lg border border-bonsai-slate-200 bg-white px-3 py-2 text-body font-semibold text-bonsai-slate-800 hover:bg-bonsai-slate-50 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
              >
                Today
              </button>
            </div>
          </div>
          <p className="mt-2 text-secondary text-bonsai-slate-500">
            Select a date to log entries in the past or plan ahead.
          </p>
        </div>

        {/* Status: loading / error */}
        {loading && (
          <p className="text-body text-bonsai-slate-500 py-8">Loading habits…</p>
        )}
        {error && (
          <p className="text-body text-red-600 py-2" role="alert">
            {error}
          </p>
        )}

        {/* Empty state: no habits */}
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

        {/* Main content: habits grid */}
        <div className="pb-8">
          {!loading && hasHabits && (
            <HabitGrid
              habits={habitsWithStreaks}
              entriesByHabit={entriesByHabit}
              selectedDateYMD={selectedDateYMD}
              onSetEntry={setEntry}
              onEditHabit={handleEditHabit}
            />
          )}
        </div>
      </div>

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
