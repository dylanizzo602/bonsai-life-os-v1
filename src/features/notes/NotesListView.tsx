/* NotesListView: List view with header, New Doc button, and document table */
import { useState, useMemo } from 'react'
import { AddButton } from '../../components/AddButton'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { NotesIcon } from '../../components/icons'
import type { Note } from './types'

interface NotesListViewProps {
  /** All notes (from useNotes) */
  notes: Note[]
  /** Loading state */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Create a new empty note and open it (parent sets selectedNoteId) */
  onNewDoc: () => void
  /** Open a note by id (parent sets selectedNoteId) */
  onNoteClick: (id: string) => void
}

/**
 * List view for the notes section: header, New Doc button, and document table.
 */
export function NotesListView({
  notes,
  loading,
  error,
  onNewDoc,
  onNoteClick,
}: NotesListViewProps) {
  /* Search filter: client-side filter by title */
  const [search, setSearch] = useState('')
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes
    const q = search.trim().toLowerCase()
    return notes.filter((n) => n.title.toLowerCase().includes(q))
  }, [notes, search])

  /* Format date for table cell */
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div className="min-h-full">
      {/* Header: Page title and New Doc button */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
        <h1 className="text-page-title font-bold text-bonsai-brown-700">Notes</h1>
        <div className="shrink-0">
          <AddButton onClick={onNewDoc} hideChevron>
            New Doc
          </AddButton>
        </div>
      </div>

      {/* Document list: Search and table */}
      <section aria-label="All documents">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notes by title"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <p className="text-body text-bonsai-slate-500 py-8">Loading notes…</p>
        )}

        {/* Error state */}
        {error && (
          <p className="text-body text-red-600 py-2" role="alert">
            {error}
          </p>
        )}

        {/* Empty state: No notes or no search results */}
        {!loading && !error && filteredNotes.length === 0 && (
          <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-8">
            <div className="text-center">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bonsai-slate-100">
                  <NotesIcon className="h-7 w-7 text-bonsai-slate-500" />
                </div>
              </div>
              <h2 className="mt-4 text-body font-semibold text-bonsai-brown-700">
                {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
              </h2>
              <p className="mt-2 text-secondary text-bonsai-slate-600">
                {notes.length === 0 ? 'Create a note with New Doc.' : 'Try a different search.'}
              </p>
              {notes.length === 0 && (
                <div className="mt-6">
                  <Button variant="primary" onClick={onNewDoc}>
                    New Doc
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document table: Name and Date updated */}
        {!loading && !error && filteredNotes.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-bonsai-slate-200 bg-white">
            <table className="w-full min-w-[320px]" role="table">
              <thead>
                <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50">
                  <th
                    className="px-4 py-3 text-left text-secondary font-medium text-bonsai-slate-700"
                    scope="col"
                  >
                    Name
                  </th>
                  <th
                    className="px-4 py-3 text-left text-secondary font-medium text-bonsai-slate-700"
                    scope="col"
                  >
                    Date updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note) => (
                  <tr
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNoteClick(note.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onNoteClick(note.id)
                      }
                    }}
                    className="border-b border-bonsai-slate-100 transition-colors hover:bg-bonsai-slate-50 last:border-b-0 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:ring-inset"
                    aria-label={`Open note: ${note.title || 'Untitled'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <NotesIcon className="h-5 w-5 shrink-0 text-bonsai-slate-400" />
                        <span className="text-body text-bonsai-slate-800 truncate">
                          {note.title || 'Untitled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary text-bonsai-slate-600">
                      {formatDate(note.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
