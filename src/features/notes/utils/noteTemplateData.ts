/* noteTemplateData helpers: Build NoteTemplateData snapshots from notes or draft state */
import type {
  Note,
  NotePage,
  NoteTemplateData,
  NoteTemplatePageSnapshot,
} from '../types'

export interface NoteTemplateIncludedFields {
  /** Save notebook / document title */
  documentTitle: boolean
  /** Save page HTML content */
  pageContent: boolean
  /** Save subpages under each top-level page */
  subpages: boolean
  /** Save additional top-level pages (when false, only first/selected page) */
  additionalPages: boolean
}

export const DEFAULT_NOTE_TEMPLATE_INCLUDED_FIELDS: NoteTemplateIncludedFields = {
  documentTitle: true,
  pageContent: true,
  subpages: true,
  additionalPages: true,
}

export interface NoteTemplateDraft {
  documentTitle: string
  pages: NoteTemplatePageSnapshot[]
  /** Top-level page index used when additionalPages is unchecked */
  selectedTopLevelPageIndex?: number
}

const DEFAULT_PAGE_TITLE = 'Untitled'

/** Normalize a page title for empty-check heuristics. */
function isDefaultTitle(title: string): boolean {
  const t = title.trim()
  return t === '' || t === DEFAULT_PAGE_TITLE
}

/** True when HTML content is empty or only blank paragraphs. */
function isEmptyContent(content: string): boolean {
  const stripped = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return stripped === ''
}

/**
 * Build page snapshots from persisted note pages (grouped by parent_page_id).
 */
export function buildTemplateDataFromPages(
  noteTitle: string,
  pages: NotePage[],
  selectedPageId?: string | null,
): NoteTemplateData {
  const topLevel = pages
    .filter((p) => p.parent_page_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  const pageSnapshots: NoteTemplatePageSnapshot[] = topLevel.map((page) => {
    const subpages = pages
      .filter((p) => p.parent_page_id === page.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sp) => ({
        title: sp.title,
        content: sp.content ?? '',
      }))

    return {
      title: page.title,
      content: page.content ?? '',
      subpages,
    }
  })

  if (pageSnapshots.length === 0) {
    return {
      title: noteTitle,
      pages: [{ title: DEFAULT_PAGE_TITLE, content: '', subpages: [] }],
    }
  }

  void selectedPageId
  return {
    title: noteTitle,
    pages: pageSnapshots,
  }
}

/**
 * Build a template payload from current draft UI state (may include unsaved editor HTML).
 */
export function buildTemplateDataFromDraft(
  draft: NoteTemplateDraft,
  included?: NoteTemplateIncludedFields,
): NoteTemplateData {
  const fields = included ?? DEFAULT_NOTE_TEMPLATE_INCLUDED_FIELDS

  let pages = draft.pages.map((page) => ({
    title: page.title,
    content: fields.pageContent ? page.content : '',
    subpages: fields.subpages
      ? page.subpages.map((sp) => ({
          title: sp.title,
          content: fields.pageContent ? sp.content : '',
        }))
      : [],
  }))

  if (!fields.additionalPages && pages.length > 0) {
    const idx = Math.min(
      Math.max(draft.selectedTopLevelPageIndex ?? 0, 0),
      pages.length - 1,
    )
    pages = [pages[idx]]
  }

  return {
    title: fields.documentTitle ? draft.documentTitle : '',
    pages,
  }
}

/** Remove fields from a saved template payload according to Included Fields selection. */
export function filterTemplateDataByIncludedFields(
  data: NoteTemplateData,
  included: NoteTemplateIncludedFields,
  selectedPageIndex = 0,
): NoteTemplateData {
  let pages = data.pages.map((page) => ({
    title: page.title,
    content: included.pageContent ? page.content : '',
    subpages: included.subpages
      ? page.subpages.map((sp) => ({
          title: sp.title,
          content: included.pageContent ? sp.content : '',
        }))
      : [],
  }))

  if (!included.additionalPages && pages.length > 0) {
    const idx = Math.min(Math.max(selectedPageIndex, 0), pages.length - 1)
    pages = [pages[idx]]
  }

  return {
    title: included.documentTitle ? data.title : '',
    pages,
  }
}

/** Build a human-friendly one-line summary for library rows. */
export function getNoteTemplateSummaryLine(data: NoteTemplateData): string {
  const pageCount = data.pages.length
  const subpageCount = data.pages.reduce((sum, p) => sum + p.subpages.length, 0)
  const parts: string[] = []
  if (pageCount > 0) {
    parts.push(`${pageCount} page${pageCount === 1 ? '' : 's'}`)
  }
  if (subpageCount > 0) {
    parts.push(`${subpageCount} subpage${subpageCount === 1 ? '' : 's'}`)
  }
  return parts.length > 0 ? parts.join(' • ') : 'Empty template'
}

/**
 * Heuristic: note is still blank enough to apply a template from doc view.
 */
export function isNoteEmptyForTemplateApply(note: Note, pages: NotePage[]): boolean {
  if (pages.length !== 1) return false
  const onlyPage = pages[0]
  if (onlyPage.parent_page_id !== null) return false
  if (!isDefaultTitle(note.title) && !isDefaultTitle(onlyPage.title)) return false
  if (!isDefaultTitle(note.title) && isDefaultTitle(onlyPage.title)) {
    /* single-page note with custom library title but default page title is ok */
  }
  if (!isDefaultTitle(onlyPage.title) && isDefaultTitle(note.title)) return false
  return isEmptyContent(onlyPage.content ?? '')
}

/** Build draft page snapshots from persisted pages, merging live editor overrides. */
export function buildDraftFromPages(
  pages: NotePage[],
  overrides?: {
    documentTitle?: string
    selectedPageId?: string | null
    selectedPageTitle?: string
    selectedPageContent?: string
  },
): NoteTemplateDraft {
  const base = buildTemplateDataFromPages(
    overrides?.documentTitle ?? '',
    pages,
    overrides?.selectedPageId,
  )

  if (overrides?.selectedPageId && overrides.selectedPageTitle !== undefined) {
    const topLevel = pages
      .filter((p) => p.parent_page_id === null)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = topLevel.findIndex((p) => p.id === overrides.selectedPageId)
    if (idx >= 0 && base.pages[idx]) {
      base.pages[idx] = {
        ...base.pages[idx],
        title: overrides.selectedPageTitle,
        content: overrides.selectedPageContent ?? base.pages[idx].content,
      }
    }
  }

  return {
    documentTitle: overrides?.documentTitle ?? base.title,
    pages: base.pages,
    selectedTopLevelPageIndex:
      overrides?.selectedPageId != null
        ? getSelectedTopLevelPageIndex(pages, overrides.selectedPageId)
        : 0,
  }
}

/** Find index of selected top-level page for included-fields filtering. */
export function getSelectedTopLevelPageIndex(
  pages: NotePage[],
  selectedPageId: string | null,
): number {
  if (!selectedPageId) return 0
  const topLevel = pages
    .filter((p) => p.parent_page_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
  const idx = topLevel.findIndex((p) => p.id === selectedPageId)
  return idx >= 0 ? idx : 0
}
