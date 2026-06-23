/* Habits page: Material layout with active cards, completed section, reminders bento, and modal */

import { useMemo, useState, useEffect } from 'react'
import { MaterialIcon } from '../../components/MaterialIcon'
import { HabitsIcon } from '../../components/icons'
import { useTasks } from '../tasks/hooks/useTasks'
import { useHabits } from './hooks/useHabits'
import { AddEditHabitModal } from './AddEditHabitModal'
import { HabitDateNav } from './components/HabitDateNav'
import { HabitDatePickerModal } from './components/HabitDatePickerModal'
import { HabitActiveCard } from './components/HabitActiveCard'
import { HabitCompletedSection } from './components/HabitCompletedSection'
import { HabitRemindersPanel } from './components/HabitRemindersPanel'
import { HabitSectionHeader } from './components/HabitSectionHeader'
import type { HabitEntry, HabitWithStreaks } from './types'
import { isHabitScheduledOnDate } from './utils/habitScheduling'
import { peekSearchOpenIntent, clearSearchOpenIntent } from '../search/searchOpenIntent'

/** Format YYYY-MM-DD for a friendly label */
function formatSelectedDateLabel(ymd: string, todayYMD: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const today = new Date(todayYMD + 'T12:00:00')
  const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Resolve entry status for a habit on the selected date */
function getStatusForDate(
  entriesByHabit: Record<string, HabitEntry[]>,
  habitId: string,
  ymd: string,
): 'completed' | 'minimum' | 'skipped' | null {
  const entries = entriesByHabit[habitId] ?? []
  const e = entries.find((x) => x.entry_date === ymd)
  return e ? e.status : null
}

/** Habits section: single-day editing with date nav and Material card grid */
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

  const { tasks } = useTasks()

  const [selectedDateYMD, setSelectedDateYMD] = useState(() => todayYMD)
  const [modalOpen, setModalOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStreaks | null>(null)

  /* Sync hook date range to the selected single day on mount and when date changes */
  useEffect(() => {
    setDateRange({ start: selectedDateYMD, end: selectedDateYMD })
  }, [selectedDateYMD, setDateRange])

  const selectedLabel = useMemo(
    () => formatSelectedDateLabel(selectedDateYMD, todayYMD),
    [selectedDateYMD, todayYMD],
  )

  const completedSectionTitle =
    selectedDateYMD === todayYMD ? 'Completed Today' : `Completed on ${selectedLabel}`

  /* Partition habits for the selected date */
  const { activeHabits, completedHabits, unscheduledHabits } = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
    const sorted = [...habitsWithStreaks].sort((a, b) => collator.compare(a.name, b.name))

    const active: HabitWithStreaks[] = []
    const completed: HabitWithStreaks[] = []
    const unscheduled: HabitWithStreaks[] = []

    for (const habit of sorted) {
      const scheduled = isHabitScheduledOnDate(habit, selectedDateYMD)
      if (!scheduled) {
        unscheduled.push(habit)
        continue
      }
      const status = getStatusForDate(entriesByHabit, habit.id, selectedDateYMD)
      if (status === 'completed') {
        completed.push(habit)
      } else {
        active.push(habit)
      }
    }

    return { activeHabits: active, completedHabits: completed, unscheduledHabits: unscheduled }
  }, [habitsWithStreaks, selectedDateYMD, entriesByHabit])

  const handleChangeSelectedDate = (ymd: string) => {
    setSelectedDateYMD(ymd)
  }

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

  /* Global search: open habit edit modal when navigated from search result */
  useEffect(() => {
    const intent = peekSearchOpenIntent()
    if (intent?.kind !== 'habit') return
    const habit = habitsWithStreaks.find((h) => h.id === intent.id)
    if (!habit) return

    clearSearchOpenIntent()
    const frame = requestAnimationFrame(() => {
      setEditingHabit(habit)
      setModalOpen(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [habitsWithStreaks])

  const hasHabits = habitsWithStreaks.length > 0

  return (
    <div className="min-h-full w-full max-w-[1200px] mx-auto pb-16 md:pb-24">
      {/* Header: title, date nav, add habit */}
      <header className="mb-10 flex flex-col items-start justify-between gap-6 md:mb-12 md:flex-row md:items-end">
        <div>
          <h1 className="text-page-title font-semibold font-headline tracking-tight text-on-surface">
            Habits
          </h1>
          <p className="mt-2 max-w-xl text-secondary text-on-surface-variant">
            Consistency is the bridge between goals and accomplishment.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <HabitDateNav
            label={selectedLabel}
            onPrev={() => handleChangeSelectedDate(addDays(selectedDateYMD, -1))}
            onNext={() => handleChangeSelectedDate(addDays(selectedDateYMD, 1))}
            onOpenDatePicker={() => setDatePickerOpen(true)}
          />
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-body font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
          >
            <MaterialIcon name="add" className="text-[20px]" />
            Add Habit
          </button>
        </div>
      </header>

      {/* Loading / error */}
      {loading && (
        <p className="text-body py-8 text-on-surface-variant">Loading habits…</p>
      )}
      {error && (
        <p className="text-body py-2 text-error" role="alert">
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && habitsWithStreaks.length === 0 && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                <HabitsIcon className="h-7 w-7 text-outline" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-body font-semibold text-on-surface">
              No habits yet
            </h2>
            <p className="mt-2 text-center text-body text-on-surface-variant">
              Start building consistency by creating your first habit tracker.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-body font-semibold text-on-primary transition-colors hover:bg-primary-container"
              >
                <MaterialIcon name="add" className="text-[20px]" />
                Create Your First Habit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active habits grid */}
      {!loading && hasHabits && activeHabits.length > 0 && (
        <section className="mb-16">
          <HabitSectionHeader label="Active Habits" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeHabits.map((habit) => (
              <HabitActiveCard
                key={habit.id}
                habit={habit}
                entriesByHabit={entriesByHabit}
                selectedDateYMD={selectedDateYMD}
                isScheduled
                onSetEntry={setEntry}
                onEditHabit={handleEditHabit}
              />
            ))}
          </div>
        </section>
      )}

      {/* No active habits message when all completed or none scheduled */}
      {!loading && hasHabits && activeHabits.length === 0 && completedHabits.length === 0 && unscheduledHabits.length === 0 && (
        <p className="mb-8 text-body text-on-surface-variant">
          No habits are scheduled for this date.
        </p>
      )}

      {/* Completed section */}
      {!loading && (
        <HabitCompletedSection
          title={completedSectionTitle}
          habits={completedHabits}
          onEditHabit={handleEditHabit}
        />
      )}

      {/* Unscheduled habits */}
      {!loading && unscheduledHabits.length > 0 && (
        <section className="mb-16">
          <HabitSectionHeader label="Not Scheduled" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unscheduledHabits.map((habit) => (
              <HabitActiveCard
                key={habit.id}
                habit={habit}
                entriesByHabit={entriesByHabit}
                selectedDateYMD={selectedDateYMD}
                isScheduled={false}
                onSetEntry={setEntry}
                onEditHabit={handleEditHabit}
              />
            ))}
          </div>
        </section>
      )}

      {/* Reminders bento */}
      {!loading && hasHabits && (
        <HabitRemindersPanel
          habits={habitsWithStreaks}
          tasks={tasks}
          todayYMD={todayYMD}
          entriesByHabit={entriesByHabit}
        />
      )}

      <AddEditHabitModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onCreateHabit={createHabit}
        onUpdateHabit={updateHabit}
        onDeleteHabit={deleteHabit}
        habit={editingHabit}
      />

      <HabitDatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        value={selectedDateYMD}
        onSelect={handleChangeSelectedDate}
      />
    </div>
  )
}
