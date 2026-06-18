/* Notes data access layer: Supabase CRUD for note documents */
import { supabase } from './client'
import { createNotePage } from './notePages'
import type { Note, CreateNoteInput, UpdateNoteInput } from '../../features/notes/types'

const NOTE_SELECT =
  'id, title, content, folder_id, cover_image_url, cover_storage_path, created_at, updated_at'

/**
 * Fetch all notes ordered by most recently updated first.
 */
export async function getNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_SELECT)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching notes:', error)
    throw error
  }

  return (data ?? []) as Note[]
}

/**
 * Fetch a single note by id.
 */
export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching note:', error)
    throw error
  }

  return data as Note | null
}

/**
 * Create a new note document and its first top-level page.
 */
export async function createNote(input: CreateNoteInput = {}): Promise<Note> {
  const insertPayload: Record<string, unknown> = {
    title: input.title ?? '',
    content: '',
  }
  if (input.folder_id !== undefined) {
    insertPayload.folder_id = input.folder_id
  }

  const { data, error } = await supabase
    .from('notes')
    .insert(insertPayload)
    .select(NOTE_SELECT)
    .single()

  if (error) {
    console.error('Error creating note:', error)
    throw error
  }

  const note = data as Note

  await createNotePage({
    note_id: note.id,
    title: input.firstPageTitle ?? 'Untitled',
    sort_order: 0,
  })

  return note
}

/**
 * Update an existing note document. Only provided fields are updated.
 */
export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.folder_id !== undefined) payload.folder_id = input.folder_id
  if (input.cover_image_url !== undefined) payload.cover_image_url = input.cover_image_url
  if (input.cover_storage_path !== undefined) payload.cover_storage_path = input.cover_storage_path

  if (Object.keys(payload).length === 0) {
    const existing = await getNote(id)
    if (!existing) throw new Error('Note not found')
    return existing
  }

  const { data, error } = await supabase
    .from('notes')
    .update(payload)
    .eq('id', id)
    .select(NOTE_SELECT)
    .single()

  if (error) {
    console.error('Error updating note:', error)
    throw error
  }

  return data as Note
}

/**
 * Touch note updated_at (e.g. after page edits if trigger is unavailable).
 */
export async function touchNoteUpdatedAt(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error touching note updated_at:', error)
    throw error
  }
}

/**
 * Delete a note document by id (cascades to pages).
 */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)

  if (error) {
    console.error('Error deleting note:', error)
    throw error
  }
}
