/* HabitLinkSection component: Link habits to goals and display linked habits with progress */
import { useState } from 'react'
import { Button } from '../../components/Button'
import { PlusIcon } from '../../components/icons'
import { useHabits } from '../habits/hooks/useHabits'
import { Select } from '../../components/Select'
import type { Habit } from '../habits/types'

interface HabitLinkSectionProps {
  /** Goal ID */
  goalId: string
  /** Linked habits (with habit data) */
  linkedHabits: Array<{
    id: string
    habit_id: string
    habit: {
      id: string
      name: string
      color: string
    }
  }>
  /** Link habit handler */
  onLinkHabit: (habitId: string) => Promise<void>
  /** Unlink habit handler */
  onUnlinkHabit: (habitId: string) => Promise<void>
}

/**
 * Habit link section component.
 * Displays linked habits and allows linking/unlinking habits to goals.
 */
export function HabitLinkSection({
  goalId,
  linkedHabits,
  onLinkHabit,
  onUnlinkHabit,
}: HabitLinkSectionProps) {
  const { habitsWithStreaks } = useHabits()
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [selectedHabitId, setSelectedHabitId] = useState('')

  /* Get available habits (not already linked) */
  const availableHabits = habitsWithStreaks.filter(
    (h) => !linkedHabits.some((lh) => lh.habit_id === h.id),
  )

  /* Handle link habit */
  const handleLinkHabit = async () => {
    if (!selectedHabitId) return
    await onLinkHabit(selectedHabitId)
    setSelectedHabitId('')
    setShowLinkPicker(false)
  }

  /* Handle unlink habit */
  const handleUnlinkHabit = async (habitId: string) => {
    if (confirm('Are you sure you want to unlink this habit?')) {
      await onUnlinkHabit(habitId)
    }
  }

  return (
    <div>
      {/* Header: title and link button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-body font-semibold text-bonsai-brown-700">Linked Habits</h2>
        {availableHabits.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowLinkPicker(!showLinkPicker)}
          >
            <PlusIcon className="w-4 h-4" />
            Link Habit
          </Button>
        )}
      </div>

      {/* Link habit picker */}
      {showLinkPicker && availableHabits.length > 0 && (
        <div className="mb-4 p-4 bg-bonsai-slate-50 rounded-lg border border-bonsai-slate-200">
          <Select
            label="Select a habit to link"
            options={[
              { value: '', label: 'Select a habit...' },
              ...availableHabits.map((h) => ({ value: h.id, label: h.name })),
            ]}
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
          />
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleLinkHabit}
              disabled={!selectedHabitId}
            >
              Link
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowLinkPicker(false)
                setSelectedHabitId('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Linked habits list */}
      {linkedHabits.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500 py-4">
          No habits linked yet. Link habits to track their progress alongside this goal.
        </p>
      ) : (
        <div className="space-y-2">
          {linkedHabits.map((link) => {
            const habit = habitsWithStreaks.find((h) => h.id === link.habit_id)
            return (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-white border border-bonsai-slate-200 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-bonsai-brown-700">{link.habit.name}</h4>
                  {habit && (
                    <div className="flex items-center gap-4 mt-1 text-secondary text-bonsai-slate-600">
                      <span>Current streak: {habit.currentStreak} days</span>
                      <span>Longest streak: {habit.longestStreak} days</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleUnlinkHabit(link.habit_id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                  aria-label="Unlink habit"
                >
                  Unlink
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
