/* Core note display helpers (no page-preview deps to avoid circular imports) */
import type { Note } from '../types'

/** Curated Material icon names for note folders */
export const FOLDER_ICON_OPTIONS = [
  'folder_open',
  'campaign',
  'auto_stories',
  'lightbulb',
  'work',
  'school',
  'favorite',
  'science',
  'palette',
  'travel_explore',
  'restaurant',
  'fitness_center',
] as const

export const DEFAULT_FOLDER_ICON = 'folder_open'

/** Strip HTML to plain text for card previews */
export function stripHtmlPreview(html: string): string {
  if (!html.trim()) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Format updated_at as "Edited Oct 12, 2023" */
export function formatNoteEditedDate(iso: string): string {
  const d = new Date(iso)
  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `Edited ${formatted}`
}

/** localStorage key for grid/list view preference */
export const NOTES_VIEW_MODE_KEY = 'bonsai-notes-view-mode'

/** Read persisted view mode; defaults to grid */
export function getPersistedViewMode(): 'grid' | 'list' {
  try {
    const stored = localStorage.getItem(NOTES_VIEW_MODE_KEY)
    if (stored === 'grid' || stored === 'list') return stored
  } catch {
    /* Ignore localStorage errors */
  }
  return 'grid'
}

/** Persist view mode preference */
export function persistViewMode(mode: 'grid' | 'list'): void {
  try {
    localStorage.setItem(NOTES_VIEW_MODE_KEY, mode)
  } catch {
    /* Ignore localStorage errors */
  }
}

/** @deprecated Use getNotePreviewText with pages */
export function getLegacyNotePreview(note: Note): string {
  return stripHtmlPreview(note.content)
}
