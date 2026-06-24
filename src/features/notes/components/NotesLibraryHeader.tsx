/* NotesLibraryHeader: Page title, subtitle, search, and New Note action */
import { NotesSearchBar } from './NotesSearchBar'
import { NewNoteSplitButton } from './NewNoteSplitButton'

interface NotesLibraryHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  onNewNote: () => void
  onCreateFromTemplate: () => void
}

/**
 * Notes Library page header with search and primary create action.
 */
export function NotesLibraryHeader({
  search,
  onSearchChange,
  onNewNote,
  onCreateFromTemplate,
}: NotesLibraryHeaderProps) {
  return (
    <header className="mb-10 flex flex-col items-start justify-between gap-6 md:mb-12 md:flex-row md:items-end">
      <div>
        <h1 className="text-page-title font-semibold font-headline tracking-tight text-on-surface">
          Notes Library
        </h1>
        <p className="mt-2 max-w-xl text-secondary text-on-surface-variant">
          A curated space for your thoughts, research, and creative inspirations.
        </p>
      </div>
      {/* Search + New Note: half-width search, button on the opposite side */}
      <div className="flex w-full items-center gap-3 md:ml-auto md:w-1/2 md:shrink-0">
        <div className="min-w-0 w-1/2">
          <NotesSearchBar value={search} onChange={onSearchChange} />
        </div>
        <div className="flex w-1/2 justify-end">
          <NewNoteSplitButton
            onNewNote={onNewNote}
            onCreateFromTemplate={onCreateFromTemplate}
          />
        </div>
      </div>
    </header>
  )
}
