/* Reflection entries data access: create and list reflection entries (e.g. morning briefings) */

import { supabase } from './client'
import type { ReflectionEntry, CreateReflectionEntryInput } from '../../features/reflections/types'

/**
 * Create a new reflection entry (e.g. after completing morning briefing).
 */
export async function createReflectionEntry(
  input: CreateReflectionEntryInput,
): Promise<ReflectionEntry> {
  const { data, error } = await supabase
    .from('reflection_entries')
    .insert({
      user_id: input.user_id ?? null,
      type: input.type,
      title: input.title ?? null,
      responses: input.responses ?? {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating reflection entry:', error)
    throw error
  }
  return data as ReflectionEntry
}

/**
 * Fetch a single reflection entry by id.
 */
export async function getReflectionEntry(id: string): Promise<ReflectionEntry | null> {
  const { data, error } = await supabase
    .from('reflection_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching reflection entry:', error)
    throw error
  }
  return data as ReflectionEntry
}

/**
 * Fetch reflection entries for listing (e.g. Reflections page), newest first.
 */
export async function getReflectionEntries(limit = 50): Promise<ReflectionEntry[]> {
  const { data, error } = await supabase
    .from('reflection_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching reflection entries:', error)
    throw error
  }
  return (data as ReflectionEntry[]) ?? []
}

/**
 * Return true if the user has completed a morning briefing today (at least one reflection entry
 * with type 'morning_briefing' and created_at on today's calendar day).
 */
export async function getHasCompletedMorningBriefingToday(): Promise<boolean> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const from = todayStart.toISOString()
  const to = todayEnd.toISOString()

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('id')
    .eq('type', 'morning_briefing')
    .gte('created_at', from)
    .lt('created_at', to)
    .limit(1)

  if (error) {
    console.error('Error checking morning briefing today:', error)
    return false
  }
  return (data?.length ?? 0) > 0
}

/**
 * Fetch the reflection entry closest to one year ago today (for "One year ago today..." widget).
 * Looks in a window of 7 days around that date and returns the entry whose created_at is closest.
 */
export async function getReflectionEntryOneYearAgo(): Promise<ReflectionEntry | null> {
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const windowDays = 7
  const from = new Date(oneYearAgo)
  from.setDate(from.getDate() - windowDays)
  const to = new Date(oneYearAgo)
  to.setDate(to.getDate() + windowDays + 1)
  const fromStr = from.toISOString()
  const toStr = to.toISOString()
  const targetMs = oneYearAgo.getTime()

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('*')
    .gte('created_at', fromStr)
    .lt('created_at', toStr)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching reflection entry one year ago:', error)
    return null
  }

  const entries = (data as ReflectionEntry[]) ?? []
  if (entries.length === 0) return null

  let closest = entries[0]
  let minDist = Math.abs(new Date(closest.created_at).getTime() - targetMs)
  for (let i = 1; i < entries.length; i++) {
    const dist = Math.abs(new Date(entries[i].created_at).getTime() - targetMs)
    if (dist < minDist) {
      minDist = dist
      closest = entries[i]
    }
  }
  return closest
}
