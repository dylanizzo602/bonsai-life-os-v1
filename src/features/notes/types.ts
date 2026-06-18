/* Notes feature types: Note, folder, page, and CRUD input types */

/** Note folder as returned from the database */
export interface NoteFolder {
  id: string
  name: string
  icon_name: string
  created_at: string
  updated_at: string
}

/** Note document as returned from the database (library container) */
export interface Note {
  id: string
  title: string
  /** @deprecated Content lives on note_pages; kept for migration compatibility */
  content: string
  folder_id: string | null
  cover_image_url: string | null
  cover_storage_path: string | null
  created_at: string
  updated_at: string
}

/** Page or subpage within a note document */
export interface NotePage {
  id: string
  note_id: string
  parent_page_id: string | null
  title: string
  content: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** Tree node for sidebar rendering */
export interface NotePageTreeNode extends NotePage {
  children: NotePage[]
}

/** Library view mode for recent notes */
export type NotesViewMode = 'grid' | 'list'

/** Input for creating a new note document */
export interface CreateNoteInput {
  title?: string
  folder_id?: string | null
  /** Optional first page title */
  firstPageTitle?: string
}

/** Input for updating an existing note document */
export interface UpdateNoteInput {
  title?: string
  folder_id?: string | null
  cover_image_url?: string | null
  cover_storage_path?: string | null
}

/** Input for creating a note page */
export interface CreateNotePageInput {
  note_id: string
  parent_page_id?: string | null
  title?: string
  content?: string
  sort_order?: number
}

/** Input for updating a note page */
export interface UpdateNotePageInput {
  title?: string
  content?: string
}

/** Input for creating a note folder */
export interface CreateNoteFolderInput {
  name: string
  icon_name?: string
}

/** Input for updating a note folder */
export interface UpdateNoteFolderInput {
  name?: string
  icon_name?: string
}
