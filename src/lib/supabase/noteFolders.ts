/* Note folders data access layer: Supabase CRUD for note folders */
import { supabase } from './client'
import type {
  NoteFolder,
  CreateNoteFolderInput,
  UpdateNoteFolderInput,
} from '../../features/notes/types'

const FOLDER_SELECT = 'id, name, icon_name, created_at, updated_at'

/**
 * Fetch all note folders for the current user, ordered by name.
 */
export async function getNoteFolders(): Promise<NoteFolder[]> {
  const { data, error } = await supabase
    .from('note_folders')
    .select(FOLDER_SELECT)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching note folders:', error)
    throw error
  }

  return (data ?? []) as NoteFolder[]
}

/**
 * Create a new note folder.
 */
export async function createNoteFolder(input: CreateNoteFolderInput): Promise<NoteFolder> {
  const { data, error } = await supabase
    .from('note_folders')
    .insert({
      name: input.name.trim(),
      icon_name: input.icon_name ?? 'folder_open',
    })
    .select(FOLDER_SELECT)
    .single()

  if (error) {
    console.error('Error creating note folder:', error)
    throw error
  }

  return data as NoteFolder
}

/**
 * Update an existing note folder.
 */
export async function updateNoteFolder(
  id: string,
  input: UpdateNoteFolderInput,
): Promise<NoteFolder> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.icon_name !== undefined) payload.icon_name = input.icon_name

  const { data, error } = await supabase
    .from('note_folders')
    .update(payload)
    .eq('id', id)
    .select(FOLDER_SELECT)
    .single()

  if (error) {
    console.error('Error updating note folder:', error)
    throw error
  }

  return data as NoteFolder
}

/**
 * Delete a note folder. Notes in the folder become uncategorized (ON DELETE SET NULL).
 */
export async function deleteNoteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('note_folders').delete().eq('id', id)

  if (error) {
    console.error('Error deleting note folder:', error)
    throw error
  }
}
