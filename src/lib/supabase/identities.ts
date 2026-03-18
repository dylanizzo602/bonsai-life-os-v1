/* Identity data access layer: Supabase queries for badge identities and their 3-slot assignments */

import { supabase } from './client'
import type { Goal } from '../../features/goals/types'
import type { Habit } from '../../features/habits/types'

export type IdentityCategory =
  | 'health'
  | 'relationships'
  | 'work'
  | 'play'
  | 'personal_growth'
  | 'finance'
  | 'community'
  | 'other'

export interface Identity {
  id: string
  user_id: string | null
  category: IdentityCategory
  badge_storage_path: string | null
  badge_url: string | null
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type IdentityItemType = 'habit' | 'goal'

export interface IdentityItem {
  id: string
  identity_id: string
  slot_index: number
  item_type: IdentityItemType
  habit_id: string | null
  goal_id: string | null
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface IdentitySlotResolved {
  slot_index: number
  item_type: IdentityItemType
  habit?: Pick<Habit, 'id' | 'name' | 'color'>
  goal?: Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>
  identity_item_id: string
  is_current: boolean
}

export interface IdentityWithSlots {
  identity: Identity
  currentSlots: Array<IdentitySlotResolved | null> // length 3
  pastCompletedGoals: Array<Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>> // derived from history rows
}

const IDENTITY_CATEGORIES: IdentityCategory[] = [
  'health',
  'relationships',
  'work',
  'play',
  'personal_growth',
  'finance',
  'community',
  'other',
]

const DEFAULT_IDENTITY_COPY: Record<
  IdentityCategory,
  { name: string; description: string; allowBadgeUpload: boolean }
> = {
  health: {
    name: 'Health',
    description: 'Health is your commitment to care for your body and energy through consistent, sustainable choices.',
    allowBadgeUpload: true,
  },
  relationships: {
    name: 'Relationships',
    description: 'Relationships represent how you show up for the people that matter: communication, support, and presence.',
    allowBadgeUpload: true,
  },
  work: {
    name: 'Work',
    description: 'Work is the effort you direct toward meaningful output, learning, and progress—without losing your balance.',
    allowBadgeUpload: true,
  },
  play: {
    name: 'Play',
    description: 'Play reminds you that joy is productive. Make time for recreation, curiosity, and fun.',
    allowBadgeUpload: true,
  },
  personal_growth: {
    name: 'Personal Growth',
    description: 'Personal growth is your practice of improving through reflection, education, and taking small steps forward.',
    allowBadgeUpload: true,
  },
  finance: {
    name: 'Finance',
    description: 'Finance focuses on habits that protect your future: budgeting, saving, and spending with intention.',
    allowBadgeUpload: true,
  },
  community: {
    name: 'Community',
    description: 'Community is about contributing beyond yourself—through support, collaboration, and shared responsibility.',
    allowBadgeUpload: true,
  },
  other: {
    name: 'Other',
    description: 'Other is a flexible category for identities and goals that don’t fit the options above.',
    allowBadgeUpload: false,
  },
}

/**
 * Ensure the 8 default identity rows exist for the current user.
 * This is intentionally not a destructive upsert: it only inserts missing categories.
 */
export async function ensureDefaultIdentities(): Promise<Identity[]> {
  const { data: existing, error } = await supabase
    .from('identities')
    .select('category')
    .order('category')

  if (error) {
    throw error
  }

  const existingCats = new Set(
    ((existing ?? []) as Array<{ category: IdentityCategory }>).map((r) => r.category),
  )
  const toCreate = IDENTITY_CATEGORIES.filter((c) => !existingCats.has(c))

  if (toCreate.length > 0) {
    const insertRows = toCreate.map((category) => {
      const copy = DEFAULT_IDENTITY_COPY[category]
      return {
        category,
        name: copy.name,
        description: copy.description,
        is_active: false,
        badge_storage_path: null,
        badge_url: null,
      }
    })

    const { error: insertError } = await supabase.from('identities').insert(insertRows)
    if (insertError) throw insertError
  }

  const { data: all, error: fetchError } = await supabase
    .from('identities')
    .select('*')
    .order('created_at', { ascending: true })

  if (fetchError) throw fetchError
  return (all ?? []) as Identity[]
}

/**
 * Fetch identities plus:
 * - current slot assignments (up to 3)
 * - derived past completed goals from history rows.
 */
export async function getIdentitiesWithSlots(): Promise<IdentityWithSlots[]> {
  const identities = await ensureDefaultIdentities()

  const identityIds = identities.map((i) => i.id)
  if (identityIds.length === 0) return []

  /* Current items: is_current=true */
  const { data: currentRows, error: currentError } = await supabase
    .from('identity_items')
    .select(
      'id, identity_id, slot_index, item_type, is_current, habit_id, goal_id, habit:habits(id,name,color), goal:goals(id,name,description,progress,is_active)',
    )
    .in('identity_id', identityIds)
    .eq('is_current', true)
    .order('slot_index', { ascending: true })

  if (currentError) throw currentError

  /* History items: keep all past rows for the slot, then filter by goal.is_active=false */
  const { data: historyRows, error: historyError } = await supabase
    .from('identity_items')
    .select('id, identity_id, slot_index, item_type, is_current, goal_id, goal:goals(id,name,description,progress,is_active)')
    .in('identity_id', identityIds)
    .eq('item_type', 'goal')
    .order('created_at', { ascending: false })

  if (historyError) throw historyError

  type CurrentIdentityItemRow = {
    id: string
    identity_id: string
    slot_index: number
    item_type: IdentityItemType
    is_current: boolean
    habit_id: string | null
    goal_id: string | null
    habit:
      | Pick<Habit, 'id' | 'name' | 'color'>
      | Array<Pick<Habit, 'id' | 'name' | 'color'>>
      | null
    goal:
      | Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>
      | Array<Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>>
      | null
  }

  type HistoryIdentityItemRow = {
    id: string
    identity_id: string
    item_type: 'goal'
    is_current: boolean
    goal_id: string | null
    goal:
      | Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>
      | Array<Pick<Goal, 'id' | 'name' | 'description' | 'progress' | 'is_active'>>
      | null
  }

  const currentByIdentity = new Map<string, Record<number, IdentitySlotResolved>>()
  for (const row of (currentRows ?? []) as CurrentIdentityItemRow[]) {
    const habitObj = Array.isArray(row.habit) ? row.habit[0] : row.habit
    const goalObj = Array.isArray(row.goal) ? row.goal[0] : row.goal

    const resolved: IdentitySlotResolved = {
      slot_index: row.slot_index,
      item_type: row.item_type,
      is_current: row.is_current,
      identity_item_id: row.id,
      habit: habitObj && row.habit_id ? habitObj : undefined,
      goal: goalObj && row.goal_id ? goalObj : undefined,
    }

    const map = currentByIdentity.get(row.identity_id) ?? {}
    map[row.slot_index] = resolved
    currentByIdentity.set(row.identity_id, map)
  }

  const pastGoalsByIdentity = new Map<string, Array<IdentityWithSlots['pastCompletedGoals'][number]>>()
  for (const row of (historyRows ?? []) as HistoryIdentityItemRow[]) {
    const goalObj = Array.isArray(row.goal) ? row.goal[0] : row.goal
    if (!goalObj) continue
    if (goalObj.is_active !== false) continue

    const list = pastGoalsByIdentity.get(row.identity_id) ?? []
    const goal = {
      id: goalObj.id,
      name: goalObj.name,
      description: goalObj.description,
      progress: goalObj.progress,
      is_active: goalObj.is_active,
    }

    const dedupeKey = goal.id
    const exists = list.some((g) => g.id === dedupeKey)
    if (!exists) list.push(goal)

    pastGoalsByIdentity.set(row.identity_id, list)
  }

  return identities.map((identity) => {
    const slotsRecord = currentByIdentity.get(identity.id) ?? {}
    const currentSlots: Array<IdentitySlotResolved | null> = [0, 1, 2].map((slotIndex) =>
      slotsRecord[slotIndex] ? slotsRecord[slotIndex] : null,
    )

    const pastCompletedGoals = pastGoalsByIdentity.get(identity.id) ?? []
    // Keep UI focused: show most recent past goals first (historyRows are sorted DESC).
    return {
      identity,
      currentSlots,
      pastCompletedGoals: pastCompletedGoals.slice(0, 10),
    }
  })
}

/**
 * Update a goal identity card badge URLs (storage path + public URL).
 */
export async function updateIdentityBadge(
  identityId: string,
  input: { badgeStoragePath: string; badgeUrl: string },
): Promise<Identity> {
  const { data, error } = await supabase
    .from('identities')
    .update({
      badge_storage_path: input.badgeStoragePath,
      badge_url: input.badgeUrl,
    })
    .eq('id', identityId)
    .select('*')
    .single()

  if (error) throw error
  return data as Identity
}

/**
 * Set an identity focus (Active/Passive).
 * Note: the caller (hook) is responsible for syncing goals.is_active.
 */
export async function setIdentityFocus(identityId: string, isActive: boolean): Promise<Identity> {
  const { data, error } = await supabase
    .from('identities')
    .update({ is_active: isActive })
    .eq('id', identityId)
    .select('*')
    .single()

  if (error) throw error
  return data as Identity
}

/**
 * Update identity display copy (name + description).
 */
export async function updateIdentityDetails(
  identityId: string,
  input: { name?: string; description?: string },
): Promise<Identity> {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description

  const { data, error } = await supabase
    .from('identities')
    .update(updates)
    .eq('id', identityId)
    .select('*')
    .single()

  if (error) throw error
  return data as Identity
}

/**
 * Replace a specific slot assignment for an identity.
 * Keeps history by marking the previous current row(s) as not current.
 */
export async function replaceIdentitySlot(
  identityId: string,
  slotIndex: 0 | 1 | 2,
  input:
    | { itemType: 'habit'; habitId: string }
    | { itemType: 'goal'; goalId: string; setGoalActive: boolean },
): Promise<void> {
  // 0) If a goal is currently assigned, deactivate it (it is no longer part of the active slots).
  const { data: prev, error: prevError } = await supabase
    .from('identity_items')
    .select('item_type, goal_id')
    .eq('identity_id', identityId)
    .eq('slot_index', slotIndex)
    .eq('is_current', true)
    .single()

  if (prevError) throw prevError
  if (prev && prev.item_type === 'goal' && prev.goal_id) {
    const { error: deactivateError } = await supabase
      .from('goals')
      .update({ is_active: false })
      .eq('id', prev.goal_id)

    if (deactivateError) throw deactivateError
  }

  // 1) Close the current slot assignment (if any) to preserve history.
  const { error: closeError } = await supabase
    .from('identity_items')
    .update({ is_current: false })
    .eq('identity_id', identityId)
    .eq('slot_index', slotIndex)
    .eq('is_current', true)

  if (closeError) throw closeError

  // 2) Insert the new current slot assignment.
  const insertRow =
    input.itemType === 'habit'
      ? {
          identity_id: identityId,
          slot_index: slotIndex,
          item_type: 'habit',
          habit_id: input.habitId,
          goal_id: null,
          is_current: true,
        }
      : {
          identity_id: identityId,
          slot_index: slotIndex,
          item_type: 'goal',
          habit_id: null,
          goal_id: input.goalId,
          is_current: true,
        }

  const { error: insertError } = await supabase.from('identity_items').insert(insertRow)
  if (insertError) throw insertError

  // 3) When the slot contains a goal, ensure goal.is_active matches identity focus + slot currentness.
  if (input.itemType === 'goal') {
    const { error: goalError } = await supabase
      .from('goals')
      .update({ is_active: input.setGoalActive })
      .eq('id', input.goalId)

    if (goalError) throw goalError
  }
}

/**
 * Mark the current slot assignment as not-current and optionally deactivate any goal.
 * Used for "complete & archive" flows.
 */
export async function clearIdentitySlot(
  identityId: string,
  slotIndex: 0 | 1 | 2,
): Promise<{ deactivatedGoalId?: string }> {
  const { data: current, error: currentError } = await supabase
    .from('identity_items')
    .select('id, item_type, goal_id')
    .eq('identity_id', identityId)
    .eq('slot_index', slotIndex)
    .eq('is_current', true)
    .single()

  if (currentError) throw currentError

  if (!current) return {}

  let deactivatedGoalId: string | undefined = undefined
  if (current.item_type === 'goal' && current.goal_id) {
    deactivatedGoalId = current.goal_id
    const { error: goalError } = await supabase.from('goals').update({ is_active: false }).eq('id', current.goal_id)
    if (goalError) throw goalError
  }

  const { error: closeError } = await supabase
    .from('identity_items')
    .update({ is_current: false })
    .eq('identity_id', identityId)
    .eq('slot_index', slotIndex)
    .eq('is_current', true)

  if (closeError) throw closeError
  return { deactivatedGoalId }
}

/**
 * Sync goals.is_active for all *current* goal assignments in the given identity.
 * This is used when toggling the identity between Active/Passive.
 */
export async function setCurrentIdentityGoalsActive(
  identityId: string,
  isActive: boolean,
): Promise<string[]> {
  const { data: currentGoalsRows, error: currentGoalsError } = await supabase
    .from('identity_items')
    .select('goal_id')
    .eq('identity_id', identityId)
    .eq('is_current', true)
    .eq('item_type', 'goal')

  if (currentGoalsError) throw currentGoalsError

  const goalIds = (currentGoalsRows ?? [])
    .map((r) => (r as { goal_id: string | null }).goal_id)
    .filter((id): id is string => id != null)

  if (goalIds.length === 0) return []

  const { error: updateError } = await supabase.from('goals').update({ is_active: isActive }).in('id', goalIds)
  if (updateError) throw updateError

  return goalIds
}

