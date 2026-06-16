/* GoalHabitLinkDraft: Search and pill selection for habits to link on goal create */
import { useMemo, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { useHabits } from '../../habits/hooks/useHabits'

interface GoalHabitLinkDraftProps {
  selectedHabitIds: string[]
  onChange: (habitIds: string[]) => void
}

/**
 * Habit search + removable pills for linking habits when creating a goal.
 */
export function GoalHabitLinkDraft({ selectedHabitIds, onChange }: GoalHabitLinkDraftProps) {
  const { habitsWithStreaks } = useHabits()
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)

  const selectedHabits = useMemo(
    () => habitsWithStreaks.filter((h) => selectedHabitIds.includes(h.id)),
    [habitsWithStreaks, selectedHabitIds],
  )

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    return habitsWithStreaks.filter((h) => {
      if (selectedHabitIds.includes(h.id)) return false
      if (!q) return true
      return h.name.toLowerCase().includes(q)
    })
  }, [habitsWithStreaks, selectedHabitIds, search])

  const addHabit = (habitId: string) => {
    if (!selectedHabitIds.includes(habitId)) {
      onChange([...selectedHabitIds, habitId])
    }
    setSearch('')
    setShowResults(false)
  }

  const removeHabit = (habitId: string) => {
    onChange(selectedHabitIds.filter((id) => id !== habitId))
  }

  return (
    <section className="space-y-4">
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
        <MaterialIcon name="cached" className="text-sm" />
        Linked Habits
      </label>

      <div className="relative">
        <MaterialIcon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search habits to link..."
          className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low py-3 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-lg">
            {searchResults.slice(0, 8).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => addHabit(h.id)}
                className="w-full px-4 py-2 text-left text-body text-on-surface hover:bg-surface-container-low"
              >
                {h.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedHabits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedHabits.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <span>{h.name}</span>
              <button
                type="button"
                onClick={() => removeHabit(h.id)}
                className="flex items-center"
                aria-label={`Remove ${h.name}`}
              >
                <MaterialIcon name="close" className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
