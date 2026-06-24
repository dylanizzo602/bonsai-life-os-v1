/* Notes feature exports */
export { NotesPage } from './NotesPage'
export { NotesLibraryView } from './NotesLibraryView'
export { NotesDocView } from './NotesDocView'
export { useNotes } from './hooks/useNotes'
export { useNoteFolders } from './hooks/useNoteFolders'
export { useNotePages } from './hooks/useNotePages'
export { useNoteTemplates } from './hooks/useNoteTemplates'
export type {
  Note,
  NotePage,
  NoteFolder,
  NoteTemplate,
  NoteTemplateData,
  NotesViewMode,
  CreateNoteInput,
  UpdateNoteInput,
  CreateNotePageInput,
  UpdateNotePageInput,
  CreateNoteFolderInput,
  UpdateNoteFolderInput,
} from './types'
