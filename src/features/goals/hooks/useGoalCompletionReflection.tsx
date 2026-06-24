/* useGoalCompletionReflection: Prompt and save goal completion reflections */

import { useCallback, useRef, useState } from 'react'
import { createReflectionEntry, hasGoalReflectionForGoal } from '../../../lib/supabase/reflections'
import type { Goal } from '../types'
import { GoalCompletionReflectionModal } from '../components/GoalCompletionReflectionModal'

type GoalPromptTarget = Pick<Goal, 'id' | 'name'>

/** True when progress crosses from incomplete to complete */
export function didGoalJustComplete(previousProgress: number, nextProgress: number): boolean {
  return previousProgress < 100 && nextProgress >= 100
}

/**
 * Manages the goal-completion reflection prompt: shows modal on first 100% crossing,
 * skips goals that already have a saved reflection or were dismissed this session.
 */
export function useGoalCompletionReflection() {
  const [pendingGoal, setPendingGoal] = useState<GoalPromptTarget | null>(null)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const sessionDismissedRef = useRef(new Set<string>())

  /* Evaluate whether to show the reflection prompt after a progress change */
  const considerPrompting = useCallback(
    async (goal: GoalPromptTarget, previousProgress: number, nextProgress: number) => {
      if (!didGoalJustComplete(previousProgress, nextProgress)) return
      if (sessionDismissedRef.current.has(goal.id)) return

      const alreadySaved = await hasGoalReflectionForGoal(goal.id)
      if (alreadySaved) return

      setPendingGoal(goal)
      setAnswer('')
    },
    [],
  )

  /* Dismiss without saving for this session */
  const dismiss = useCallback(() => {
    if (pendingGoal) {
      sessionDismissedRef.current.add(pendingGoal.id)
    }
    setPendingGoal(null)
    setAnswer('')
  }, [pendingGoal])

  /* Persist goal reflection entry */
  const save = useCallback(async () => {
    if (!pendingGoal || !answer.trim()) return

    try {
      setSaving(true)
      await createReflectionEntry({
        type: 'goal',
        title: pendingGoal.name,
        responses: {
          goalId: pendingGoal.id,
          whatContributedToSuccess: answer.trim(),
        },
      })
      setPendingGoal(null)
      setAnswer('')
    } finally {
      setSaving(false)
    }
  }, [pendingGoal, answer])

  const modal = (
    <GoalCompletionReflectionModal
      isOpen={pendingGoal != null}
      goalName={pendingGoal?.name ?? ''}
      value={answer}
      onChange={setAnswer}
      onSave={save}
      onSkip={dismiss}
      saving={saving}
    />
  )

  return {
    considerPrompting,
    modal,
  }
}
