/* Shared import/export types for Settings data management */

export type ImportMode = 'create' | 'merge'

export type ImportEntityType = 'tasks' | 'reflections' | 'notes'

/** Summary counts shown in revert UI and import feedback */
export interface ImportBatchSummary {
  createdCount: number
  updatedCount: number
  fileName?: string
}

/** Row stored in import_revert_batches for undoing the last import */
export interface ImportRevertBatchRow {
  user_id: string
  entity_type: ImportEntityType
  import_mode: ImportMode
  imported_at: string
  summary: ImportBatchSummary
  payload: TasksRevertPayload | ReflectionsRevertPayload | NotesRevertPayload
}

export interface TasksRevertPayload {
  kind: 'tasks'
  createdTaskIds: string[]
  createdTagIds: string[]
  updatedTaskSnapshots: import('../../tasks/utils/taskImportExport').CanonicalTaskRecord[]
}

export interface ReflectionEntrySnapshot {
  id: string
  type: string
  title: string | null
  responses: Record<string, unknown>
  created_at: string
}

export interface ReflectionsRevertPayload {
  kind: 'reflections'
  createdEntryIds: string[]
  updatedEntrySnapshots: ReflectionEntrySnapshot[]
}

export interface NoteImportSnapshot {
  noteId: string
  title: string
  pageId: string
  pageTitle: string
  content: string
  cover_image_url: string | null
  cover_storage_path: string | null
  created_at: string
  updated_at: string
}

export interface NotesRevertPayload {
  kind: 'notes'
  createdNoteIds: string[]
  updatedNoteSnapshots: NoteImportSnapshot[]
}
