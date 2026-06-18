/* Note display helpers: excerpts, dates, filtering, folder icons */
import type { Note, NotePage } from '../types'
import { stripHtmlPreview } from './noteDisplayCore'

export {
  FOLDER_ICON_OPTIONS,
  DEFAULT_FOLDER_ICON,
  stripHtmlPreview,
  formatNoteEditedDate,
  NOTES_VIEW_MODE_KEY,
  getPersistedViewMode,
  persistViewMode,
} from './noteDisplayCore'

/** Preview excerpt for a library card from pages */
export function getNotePreviewText(pages: NotePage[] | undefined): string {
  if (!pages?.length) return ''

  const sorted = [...pages].sort((a, b) => {
    const aTime = new Date(a.updated_at).getTime()
    const bTime = new Date(b.updated_at).getTime()
    return bTime - aTime
  })

  const withContent = sorted.find((p) => stripHtmlPreview(p.content).length > 0)
  if (withContent) return stripHtmlPreview(withContent.content)

  const topLevel = pages
    .filter((p) => p.parent_page_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
  const first = topLevel[0]
  if (first?.content) return stripHtmlPreview(first.content)

  return ''
}

export interface FilterNotesOptions {
  search?: string
  folderId?: string | null
  pagesByNoteId?: Record<string, NotePage[]>
}

/**
 * Filter notes by folder and search (document title or any page title/content).
 */
export function filterNotes(notes: Note[], options: FilterNotesOptions = {}): Note[] {
  const { search, folderId, pagesByNoteId = {} } = options
  let result = notes

  if (folderId) {
    result = result.filter((n) => n.folder_id === folderId)
  }

  const q = search?.trim().toLowerCase()
  if (q) {
    result = result.filter((n) => {
      const docTitle = (n.title || 'Untitled').toLowerCase()
      if (docTitle.includes(q)) return true

      const pages = pagesByNoteId[n.id] ?? []
      return pages.some((p) => {
        const pageTitle = (p.title || 'Untitled').toLowerCase()
        const body = stripHtmlPreview(p.content).toLowerCase()
        return pageTitle.includes(q) || body.includes(q)
      })
    })
  }

  return result
}

/** Count notes per folder id from a notes array */
export function countNotesByFolder(notes: Note[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const note of notes) {
    if (note.folder_id) {
      counts[note.folder_id] = (counts[note.folder_id] ?? 0) + 1
    }
  }
  return counts
}
