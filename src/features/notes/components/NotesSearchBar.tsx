/* NotesSearchBar: Material-style search input for the notes library */
import { MaterialIcon } from '../../../components/MaterialIcon'

interface NotesSearchBarProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Search field with icon chrome matching the Notes Library mockup.
 */
export function NotesSearchBar({ value, onChange }: NotesSearchBarProps) {
  return (
    <div className="flex h-12 w-full min-w-0 items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
      <MaterialIcon name="search" className="shrink-0 text-on-surface-variant" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your library..."
        aria-label="Search your library"
        className="w-full border-none bg-transparent p-0 text-secondary text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-0"
      />
    </div>
  )
}
