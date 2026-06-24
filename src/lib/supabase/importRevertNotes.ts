/* Revert notes CSV import */
import { supabase } from './client'
import { deleteNote, updateNote } from './notes'
import { updateNotePage } from './notePages'
import type { NotesRevertPayload } from '../../features/settings/types/importExport'

export async function revertNotesImport(payload: NotesRevertPayload): Promise<void> {
  for (const snapshot of payload.updatedNoteSnapshots) {
    await updateNote(snapshot.noteId, {
      title: snapshot.title,
      cover_image_url: snapshot.cover_image_url,
      cover_storage_path: snapshot.cover_storage_path,
    })
    await updateNotePage(snapshot.pageId, {
      title: snapshot.pageTitle,
      content: snapshot.content,
    })
    const timestamps: Record<string, string> = {}
    if (snapshot.created_at) timestamps.created_at = snapshot.created_at
    if (snapshot.updated_at) timestamps.updated_at = snapshot.updated_at
    if (Object.keys(timestamps).length > 0) {
      await supabase.from('notes').update(timestamps).eq('id', snapshot.noteId)
    }
  }

  for (const noteId of payload.createdNoteIds) {
    await deleteNote(noteId)
  }
}
