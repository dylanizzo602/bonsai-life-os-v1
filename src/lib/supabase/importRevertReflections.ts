/* Revert reflections CSV import */
import { supabase } from './client'
import { deleteReflectionEntry } from './reflections'
import type { ReflectionsRevertPayload } from '../../features/settings/types/importExport'

export async function revertReflectionsImport(
  payload: ReflectionsRevertPayload,
): Promise<void> {
  for (const snapshot of payload.updatedEntrySnapshots) {
    const { error } = await supabase
      .from('reflection_entries')
      .update({
        type: snapshot.type,
        title: snapshot.title,
        responses: snapshot.responses,
        created_at: snapshot.created_at,
      })
      .eq('id', snapshot.id)

    if (error) {
      console.error('Error reverting reflection entry:', error)
      throw error
    }
  }

  for (const id of payload.createdEntryIds) {
    await deleteReflectionEntry(id)
  }
}
