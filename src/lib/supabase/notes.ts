/* Notes data access layer: Supabase CRUD for note documents */
import { supabase } from './client'
import { createNotePage, getPagesForNote, updateNotePage } from './notePages'
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

export interface NoteExportBundle {
  note: Note
  page_title: string
  content: string
}

/**
 * Fetch all notes with primary page content for CSV export.
 */
export async function getAllNotesForExport(): Promise<NoteExportBundle[]> {
  const notes = await getNotes()
  const bundles: NoteExportBundle[] = []

  for (const note of notes) {
    const pages = await getPagesForNote(note.id)
    const primary =
      pages
        .filter((p) => p.parent_page_id === null)
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))[0] ??
      pages[0]

    bundles.push({
      note,
      page_title: primary?.title ?? 'Untitled',
      content: primary?.content ?? '',
    })
  }

  return bundles
}

export interface NoteCsvImportRow {
  id?: string | null
  title: string
  page_title: string
  content: string
  cover_image_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface NoteImportResult {
  createdNoteIds: string[]
  updatedSnapshots: Array<{
    noteId: string
    title: string
    pageId: string
    pageTitle: string
    content: string
    cover_image_url: string | null
    cover_storage_path: string | null
    created_at: string
    updated_at: string
  }>
}

/**
 * Import notes from CSV rows with optional merge-by-id.
 */
export async function bulkImportNotesFromCsv(
  rows: NoteCsvImportRow[],
  mode: 'create' | 'merge',
): Promise<NoteImportResult> {
  const result: NoteImportResult = { createdNoteIds: [], updatedSnapshots: [] }

  for (const r of rows) {
    if (mode === 'merge' && r.id?.trim()) {
      const existing = await getNote(r.id.trim())
      if (existing) {
        const pages = await getPagesForNote(existing.id)
        const primary =
          pages
            .filter((p) => p.parent_page_id === null)
            .sort((a, b) => a.sort_order - b.sort_order)[0] ?? pages[0]

        if (primary) {
          result.updatedSnapshots.push({
            noteId: existing.id,
            title: existing.title,
            pageId: primary.id,
            pageTitle: primary.title,
            content: primary.content,
            cover_image_url: existing.cover_image_url,
            cover_storage_path: existing.cover_storage_path,
            created_at: existing.created_at,
            updated_at: existing.updated_at,
          })
        }

        await updateNote(existing.id, {
          title: r.title,
          cover_image_url: r.cover_image_url ?? existing.cover_image_url,
        })

        if (primary) {
          await updateNotePage(primary.id, {
            title: r.page_title,
            content: r.content,
          })
        }

        if (r.created_at || r.updated_at) {
          const payload: Record<string, string> = {}
          if (r.created_at) payload.created_at = r.created_at
          if (r.updated_at) payload.updated_at = r.updated_at
          if (Object.keys(payload).length > 0) {
            await supabase.from('notes').update(payload).eq('id', existing.id)
          }
        }
        continue
      }
    }

    const note = await createNote({ title: r.title, firstPageTitle: r.page_title })
    result.createdNoteIds.push(note.id)

    const pages = await getPagesForNote(note.id)
    const primary = pages.find((p) => p.parent_page_id === null) ?? pages[0]
    if (primary && r.content) {
      await updateNotePage(primary.id, { content: r.content })
    }

    if (r.cover_image_url) {
      await updateNote(note.id, { cover_image_url: r.cover_image_url })
    }

    if (r.created_at || r.updated_at) {
      const payload: Record<string, string> = {}
      if (r.created_at) payload.created_at = r.created_at
      if (r.updated_at) payload.updated_at = r.updated_at
      if (Object.keys(payload).length > 0) {
        await supabase.from('notes').update(payload).eq('id', note.id)
      }
    }
  }

  return result
}
