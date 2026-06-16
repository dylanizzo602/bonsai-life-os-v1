/* useGoalFieldAutosave: local field state synced to goal with save on blur */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Goal, UpdateGoalInput } from '../types'

type GoalFieldKey = keyof Pick<
  Goal,
  'name' | 'description' | 'start_date' | 'target_date' | 'icon_name' | 'category'
>

interface UseGoalFieldAutosaveOptions<K extends GoalFieldKey> {
  goal: Goal | null
  field: K
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
  /** Optional transform before save (e.g. trim strings) */
  serialize?: (value: Goal[K]) => Goal[K] | null | undefined
  /** Return false to skip save */
  validate?: (value: Goal[K], goal: Goal) => boolean
}

/**
 * Keeps a scalar goal field in local state; persists via updateGoal on blur when changed.
 */
export function useGoalFieldAutosave<K extends GoalFieldKey>({
  goal,
  field,
  updateGoal,
  serialize,
  validate,
}: UseGoalFieldAutosaveOptions<K>) {
  const [value, setValue] = useState<Goal[K] | ''>('')
  const [saving, setSaving] = useState(false)
  const lastSaved = useRef<string>('')

  /* Sync from server when goal or field changes */
  useEffect(() => {
    if (!goal) return
    const serverVal = goal[field] ?? ''
    setValue(serverVal as Goal[K] | '')
    lastSaved.current = JSON.stringify(serverVal)
  }, [goal, field])

  const save = useCallback(async () => {
    if (!goal) return
    const raw = value as Goal[K]
    if (validate && !validate(raw, goal)) return

    const next = serialize ? serialize(raw) : raw
    const serialized = JSON.stringify(next)
    if (serialized === lastSaved.current) return

    try {
      setSaving(true)
      await updateGoal(goal.id, { [field]: next ?? null } as UpdateGoalInput)
      lastSaved.current = serialized
    } catch (err) {
      console.error(`Failed to save goal.${field}:`, err)
      setValue((goal[field] ?? '') as Goal[K] | '')
    } finally {
      setSaving(false)
    }
  }, [goal, field, value, updateGoal, serialize, validate])

  return {
    value,
    setValue,
    onBlur: () => void save(),
    saving,
  }
}
