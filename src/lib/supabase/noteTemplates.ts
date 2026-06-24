/* Note templates data access layer: Supabase queries for CRUD on note_templates */
import { supabase } from './client'
import type { NoteTemplate, NoteTemplateData } from '../../features/notes/types'

/** Fetch all note templates for the current user, ordered by most recently created. */
export async function getNoteTemplates(): Promise<NoteTemplate[]> {
  const { data, error } = await supabase
    .from('note_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching note templates:', error)
    throw error
  }

  return (data as NoteTemplate[]) ?? []
}

/** Create a new note template with the given name and data snapshot. */
export async function createNoteTemplate(input: {
  name: string
  icon?: string | null
  data: NoteTemplateData
}): Promise<NoteTemplate> {
  const { data, error } = await supabase
    .from('note_templates')
    .insert({
      name: input.name,
      icon: input.icon ?? null,
      data: input.data,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating note template:', error)
    throw error
  }

  return data as NoteTemplate
}

/** Update an existing note template snapshot (and optional metadata) by id. */
export async function updateNoteTemplate(
  id: string,
  input: {
    name?: string
    icon?: string | null
    data: NoteTemplateData
  },
): Promise<NoteTemplate> {
  const { data, error } = await supabase
    .from('note_templates')
    .update({
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      data: input.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating note template:', error)
    throw error
  }

  return data as NoteTemplate
}

/** Delete an existing note template by id. */
export async function deleteNoteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('note_templates').delete().eq('id', id)

  if (error) {
    console.error('Error deleting note template:', error)
    throw error
  }
}
