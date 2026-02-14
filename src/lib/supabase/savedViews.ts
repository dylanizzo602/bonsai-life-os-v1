/* Saved views data access: CRUD for user-defined task views (filter + sort + name) */

import { supabase } from './client'

export interface SavedView {
  id: string
  user_id: string | null
  name: string
  filter_json: unknown
  sort_json: unknown
  created_at: string
}

export interface CreateSavedViewInput {
  user_id?: string | null
  name: string
  filter_json?: unknown
  sort_json?: unknown
}

export interface UpdateSavedViewInput {
  name?: string
  filter_json?: unknown
  sort_json?: unknown
}

/**
 * Fetch all saved views for a user (or all if user_id is null).
 */
export async function getSavedViews(userId: string | null): Promise<SavedView[]> {
  let query = supabase.from('saved_views').select('*').order('created_at', { ascending: false })
  if (userId != null) {
    query = query.eq('user_id', userId)
  } else {
    query = query.is('user_id', null)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error fetching saved views:', error)
    throw error
  }
  return (data as SavedView[]) ?? []
}

/**
 * Create a new saved view.
 */
export async function createSavedView(input: CreateSavedViewInput): Promise<SavedView> {
  const { data, error } = await supabase
    .from('saved_views')
    .insert({
      user_id: input.user_id ?? null,
      name: input.name,
      filter_json: input.filter_json ?? null,
      sort_json: input.sort_json ?? null,
    })
    .select()
    .single()
  if (error) {
    console.error('Error creating saved view:', error)
    throw error
  }
  return data as SavedView
}

/**
 * Update an existing saved view.
 */
export async function updateSavedView(
  id: string,
  input: UpdateSavedViewInput,
): Promise<SavedView> {
  const { data, error } = await supabase
    .from('saved_views')
    .update({
      ...(input.name != null && { name: input.name }),
      ...(input.filter_json !== undefined && { filter_json: input.filter_json }),
      ...(input.sort_json !== undefined && { sort_json: input.sort_json }),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('Error updating saved view:', error)
    throw error
  }
  return data as SavedView
}

/**
 * Delete a saved view.
 */
export async function deleteSavedView(id: string): Promise<void> {
  const { error } = await supabase.from('saved_views').delete().eq('id', id)
  if (error) {
    console.error('Error deleting saved view:', error)
    throw error
  }
}
