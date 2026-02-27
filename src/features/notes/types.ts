/* Notes feature types: Note entity and CRUD input types */

/** Note document as returned from the database */
export interface Note {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

/** Input for creating a new note */
export interface CreateNoteInput {
  title?: string
  content?: string
}

/** Input for updating an existing note (all fields optional) */
export interface UpdateNoteInput {
  title?: string
  content?: string
}
