/* Import revert data layer: Persist and execute undo for the last CSV import */
import { supabase } from './client'
import type {
  ImportBatchSummary,
  ImportEntityType,
  ImportMode,
  ImportRevertBatchRow,
  NotesRevertPayload,
  ReflectionsRevertPayload,
  TasksRevertPayload,
} from '../../features/settings/types/importExport'
import { revertTasksImport } from '../../features/settings/utils/runTaskImport'
import { revertReflectionsImport } from './importRevertReflections'
import { revertNotesImport } from './importRevertNotes'

export type { ImportRevertBatchRow }

/** UI-friendly batch metadata */
export interface LastImportRevertBatch {
  entity_type: ImportEntityType
  import_mode: ImportMode
  imported_at: string
  summary: ImportBatchSummary
}

/**
 * Fetch the current user's last import revert batch (if any).
 */
export async function getLastImportRevertBatch(): Promise<LastImportRevertBatch | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('import_revert_batches')
    .select('entity_type, import_mode, imported_at, summary')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching import revert batch:', error)
    throw error
  }

  if (!data) return null
  const row = data as Pick<
    ImportRevertBatchRow,
    'entity_type' | 'import_mode' | 'imported_at' | 'summary'
  >
  return {
    entity_type: row.entity_type,
    import_mode: row.import_mode,
    imported_at: row.imported_at,
    summary: row.summary as ImportBatchSummary,
  }
}

/**
 * Replace the user's single revert batch after a successful import.
 */
export async function saveImportRevertBatch(input: {
  entity_type: ImportEntityType
  import_mode: ImportMode
  summary: ImportBatchSummary
  payload: TasksRevertPayload | ReflectionsRevertPayload | NotesRevertPayload
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in to save import revert batch')

  const row: ImportRevertBatchRow = {
    user_id: user.id,
    entity_type: input.entity_type,
    import_mode: input.import_mode,
    imported_at: new Date().toISOString(),
    summary: input.summary,
    payload: input.payload,
  }

  const { error } = await supabase.from('import_revert_batches').upsert(row, {
    onConflict: 'user_id',
  })

  if (error) {
    console.error('Error saving import revert batch:', error)
    throw error
  }
}

/**
 * Undo the last import and clear the revert batch.
 */
export async function revertLastImport(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in to revert import')

  const { data, error } = await supabase
    .from('import_revert_batches')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error loading import revert batch:', error)
    throw error
  }
  if (!data) throw new Error('No import to revert')

  const batch = data as ImportRevertBatchRow
  const payload = batch.payload

  if (batch.entity_type === 'tasks' && payload.kind === 'tasks') {
    await revertTasksImport(payload)
  } else if (batch.entity_type === 'reflections' && payload.kind === 'reflections') {
    await revertReflectionsImport(payload)
  } else if (batch.entity_type === 'notes' && payload.kind === 'notes') {
    await revertNotesImport(payload)
  } else {
    throw new Error('Invalid revert batch payload')
  }

  const { error: deleteError } = await supabase
    .from('import_revert_batches')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Error clearing import revert batch:', error)
    throw deleteError
  }
}
