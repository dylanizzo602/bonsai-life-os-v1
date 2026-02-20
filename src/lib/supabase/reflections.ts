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
