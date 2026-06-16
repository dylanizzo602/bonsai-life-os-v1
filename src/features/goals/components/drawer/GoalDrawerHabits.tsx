/* GoalDrawerHabits: supporting habits cards with streak and link/unlink */
import { useMemo, useState } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { useHabits } from '../../../habits/hooks/useHabits'
import { formatHabitStreakCount } from '../../../habits/formatHabitStreak'

interface LinkedHabit {
  id: string
  habit_id: string
  habit: {
    id: string
    name: string
    color: string
  }
}

interface GoalDrawerHabitsProps {
  linkedHabits: LinkedHabit[]
  onLinkHabit: (habitId: string) => Promise<void>
  onUnlinkHabit: (habitId: string) => Promise<void>
}

const HABIT_ICONS = ['edit', 'menu_book', 'cached', 'fitness_center', 'self_improvement']

/**
 * Linked habit cards with streak display and compact link picker.
 */
export function GoalDrawerHabits({
  linkedHabits,
  onLinkHabit,
  onUnlinkHabit,
}: GoalDrawerHabitsProps) {
  const { habitsWithStreaks } = useHabits()
  const [linkOpen, setLinkOpen] = useState(false)
  const [search, setSearch] = useState('')

  const available = useMemo(
    () =>
      habitsWithStreaks.filter(
        (h) => !linkedHabits.some((lh) => lh.habit_id === h.id),
      ),
    [habitsWithStreaks, linkedHabits],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return available
    return available.filter((h) => h.name.toLowerCase().includes(q))
  }, [available, search])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          Supporting Habits
        </h3>
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setLinkOpen((v) => !v)}
            className="text-xs font-bold text-primary hover:underline"
          >
            Link habit
          </button>
        )}
      </div>

      {linkOpen && (
        <div className="space-y-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search habits..."
            className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="max-h-32 overflow-y-auto">
            {filtered.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  void onLinkHabit(h.id)
                  setLinkOpen(false)
                  setSearch('')
                }}
                className="w-full px-2 py-2 text-left text-body hover:bg-surface-container-high rounded-lg"
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {linkedHabits.length === 0 ? (
          <p className="text-secondary text-on-surface-variant">No habits linked yet.</p>
        ) : (
          linkedHabits.map((link, index) => {
            const habit = habitsWithStreaks.find((h) => h.id === link.habit_id)
            const streak = habit ? formatHabitStreakCount(habit, habit.currentStreak) : '—'
            const icon = HABIT_ICONS[index % HABIT_ICONS.length]
            const accent = index % 2 === 0 ? 'primary' : 'secondary'

            return (
              <div
                key={link.id}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-outline-variant/50 p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                    }`}
                  >
                    <MaterialIcon name={icon} className="text-[20px]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-on-surface">{link.habit.name}</span>
                    <span className="text-xs text-on-surface-variant">Current habit</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className={`text-lg font-bold ${accent === 'primary' ? 'text-primary' : 'text-secondary'}`}>
                      {streak.replace(/\D/g, '') || '0'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                      Day Streak
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Unlink "${link.habit.name}"?`)) {
                        void onUnlinkHabit(link.habit_id)
                      }
                    }}
                    className="rounded-full p-1 text-outline opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                    aria-label={`Unlink ${link.habit.name}`}
                  >
                    <MaterialIcon name="close" className="text-sm" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
