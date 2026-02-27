/* Notes data access layer: Supabase CRUD for notes (documents) */
import { supabase } from './client'
import type { Note, CreateNoteInput, UpdateNoteInput } from '../../features/notes/types'

/**
 * Fetch all notes ordered by most recently updated first.
 */
export async function getNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, created_at, updated_at')
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
    .select('id, title, content, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching note:', error)
    throw error
  }

  return data as Note | null
}

/**
 * Create a new note. Title and content default to empty string if omitted.
 */
export async function createNote(input: CreateNoteInput = {}): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: input.title ?? '',
      content: input.content ?? '',
    })
    .select('id, title, content, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error creating note:', error)
    throw error
  }

  return data as Note
}

/**
 * Update an existing note. Only provided fields are updated.
 */
export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.content !== undefined) payload.content = input.content
  if (Object.keys(payload).length === 0) {
    const existing = await getNote(id)
    if (!existing) throw new Error('Note not found')
    return existing
  }

  const { data, error } = await supabase
    .from('notes')
    .update(payload)
    .eq('id', id)
    .select('id, title, content, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error updating note:', error)
    throw error
  }

  return data as Note
}

/**
 * Delete a note by id.
 */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)

  if (error) {
    console.error('Error deleting note:', error)
    throw error
  }
}
