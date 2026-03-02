/* Inbox items data access: CRUD for home dashboard Inbox widget */

import { supabase } from './client'
import type { InboxItem, CreateInboxItemInput, UpdateInboxItemInput } from '../../features/home/types'

/**
 * Fetch all inbox items, ordered by sort_order then created_at.
 */
export async function getInboxItems(): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching inbox items:', error)
    throw error
  }
  return (data as InboxItem[]) ?? []
}

/**
 * Create a new inbox item (name only).
 */
export async function createInboxItem(input: CreateInboxItemInput): Promise<InboxItem> {
  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      name: input.name,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating inbox item:', error)
    throw error
  }
  return data as InboxItem
}

/**
 * Update an inbox item (e.g. rename).
 */
export async function updateInboxItem(
  id: string,
  input: UpdateInboxItemInput,
): Promise<InboxItem> {
  const { data, error } = await supabase
    .from('inbox_items')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating inbox item:', error)
    throw error
  }
  return data as InboxItem
}

/**
 * Delete an inbox item.
 */
export async function deleteInboxItem(id: string): Promise<void> {
  const { error } = await supabase.from('inbox_items').delete().eq('id', id)
  if (error) {
    console.error('Error deleting inbox item:', error)
    throw error
  }
}
