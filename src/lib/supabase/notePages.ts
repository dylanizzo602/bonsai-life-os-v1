/* Note pages data access layer: Supabase CRUD for pages within a note document */
import { supabase } from './client'
import type {
  NotePage,
  CreateNotePageInput,
  UpdateNotePageInput,
} from '../../features/notes/types'

const PAGE_SELECT =
  'id, note_id, parent_page_id, title, content, sort_order, created_at, updated_at'

/**
 * Fetch all pages for the current user (for library search).
 */
export async function getAllNotePages(): Promise<NotePage[]> {
  const { data, error } = await supabase
    .from('note_pages')
    .select(PAGE_SELECT)
    .order('note_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching all note pages:', error)
    throw error
  }

  return (data ?? []) as NotePage[]
}

/**
 * Fetch all pages for one note document.
 */
export async function getPagesForNote(noteId: string): Promise<NotePage[]> {
  const { data, error } = await supabase
    .from('note_pages')
    .select(PAGE_SELECT)
    .eq('note_id', noteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching note pages:', error)
    throw error
  }

  return (data ?? []) as NotePage[]
}

/**
 * Get the next sort_order for a new page at the given level.
 */
async function getNextSortOrder(
  noteId: string,
  parentPageId: string | null,
): Promise<number> {
  let query = supabase
    .from('note_pages')
    .select('sort_order')
    .eq('note_id', noteId)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (parentPageId === null) {
    query = query.is('parent_page_id', null)
  } else {
    query = query.eq('parent_page_id', parentPageId)
  }

  const { data, error } = await query
  if (error) throw error
  const max = data?.[0]?.sort_order ?? -1
  return max + 1
}

/**
 * Validate parent page is top-level before creating a subpage.
 */
async function assertCanAddSubpage(parentPageId: string): Promise<void> {
  const { data, error } = await supabase
    .from('note_pages')
    .select('id, parent_page_id')
    .eq('id', parentPageId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Parent page not found')
  if (data.parent_page_id !== null) {
    throw new Error('Subpages cannot have child pages')
  }
}

/**
 * Create a new page or subpage within a note.
 */
export async function createNotePage(input: CreateNotePageInput): Promise<NotePage> {
  if (input.parent_page_id) {
    await assertCanAddSubpage(input.parent_page_id)
  }

  const sortOrder =
    input.sort_order ??
    (await getNextSortOrder(input.note_id, input.parent_page_id ?? null))

  const { data, error } = await supabase
    .from('note_pages')
    .insert({
      note_id: input.note_id,
      parent_page_id: input.parent_page_id ?? null,
      title: input.title ?? '',
      content: input.content ?? '',
      sort_order: sortOrder,
    })
    .select(PAGE_SELECT)
    .single()

  if (error) {
    console.error('Error creating note page:', error)
    throw error
  }

  return data as NotePage
}

/**
 * Update an existing note page.
 */
export async function updateNotePage(
  id: string,
  input: UpdateNotePageInput,
): Promise<NotePage> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.content !== undefined) payload.content = input.content

  const { data, error } = await supabase
    .from('note_pages')
    .update(payload)
    .eq('id', id)
    .select(PAGE_SELECT)
    .single()

  if (error) {
    console.error('Error updating note page:', error)
    throw error
  }

  return data as NotePage
}

/**
 * Delete a note page. Subpages cascade via FK.
 * Caller should ensure at least one top-level page remains.
 */
export async function deleteNotePage(id: string): Promise<void> {
  const { error } = await supabase.from('note_pages').delete().eq('id', id)

  if (error) {
    console.error('Error deleting note page:', error)
    throw error
  }
}

/**
 * Count top-level pages for a note (used before delete guard).
 */
export async function countTopLevelPages(noteId: string): Promise<number> {
  const { count, error } = await supabase
    .from('note_pages')
    .select('id', { count: 'exact', head: true })
    .eq('note_id', noteId)
    .is('parent_page_id', null)

  if (error) throw error
  return count ?? 0
}
