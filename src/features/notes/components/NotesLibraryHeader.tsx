/* NotesLibraryHeader: Page title, subtitle, search, and New Note action */
import { MaterialIcon } from '../../../components/MaterialIcon'
import { NotesSearchBar } from './NotesSearchBar'

interface NotesLibraryHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  onNewNote: () => void
}

/**
 * Notes Library page header with search and primary create action.
 */
export function NotesLibraryHeader({
  search,
  onSearchChange,
  onNewNote,
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
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
        <NotesSearchBar value={search} onChange={onSearchChange} />
        <button
          type="button"
          onClick={onNewNote}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-body font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
        >
          <MaterialIcon name="add" className="text-[20px]" />
          New Note
        </button>
      </div>
    </header>
  )
}
