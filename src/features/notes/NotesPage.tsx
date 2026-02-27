/* Notes page: List/detail container; shows list view or document view based on selection */
import { useState, useCallback } from 'react'
import { useNotes } from './hooks/useNotes'
import { NotesListView } from './NotesListView'
import { NotesDocView } from './NotesDocView'

/**
 * Notes page component.
 * When no note is selected, shows list view (document table).
 * When a note is selected, shows document view (sidebar + main content).
 */
export function NotesPage() {
  const { notes, loading, error, createNote, updateNote, deleteNote } = useNotes()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  /* Create a new empty note and open it in doc view */
  const handleNewDoc = useCallback(async () => {
    try {
      const newNote = await createNote({})
      setSelectedNoteId(newNote.id)
    } catch {
      /* Error already set in useNotes */
    }
  }, [createNote])

  /* Open an existing note in doc view */
  const handleNoteClick = useCallback((id: string) => {
    setSelectedNoteId(id)
  }, [])

  /* Return to list view */
  const handleBack = useCallback(() => {
    setSelectedNoteId(null)
  }, [])

  /* Create a new note from doc view sidebar "+ Add page" and open it */
  const handleAddPage = useCallback(async () => {
    try {
      const newNote = await createNote({})
      setSelectedNoteId(newNote.id)
    } catch {
      /* Error already set in useNotes */
    }
  }, [createNote])

  /* Document view is shown when a note is selected */
  if (selectedNoteId) {
    return (
      <NotesDocView
        notes={notes}
        selectedNoteId={selectedNoteId}
        onBack={handleBack}
        onSelectNote={handleNoteClick}
        onAddPage={handleAddPage}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
      />
    )
  }

  /* List view: document table */
  return (
    <NotesListView
      notes={notes}
      loading={loading}
      error={error}
      onNewDoc={handleNewDoc}
      onNoteClick={handleNoteClick}
    />
  )
}
