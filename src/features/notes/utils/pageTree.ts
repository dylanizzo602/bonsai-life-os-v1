/* Page tree helpers: build hierarchy and validate depth */
import type { NotePage, NotePageTreeNode } from '../types'

/**
 * Build a two-level tree from a flat page list.
 */
export function buildPageTree(pages: NotePage[]): NotePageTreeNode[] {
  const topLevel = pages
    .filter((p) => p.parent_page_id === null)
    .sort(comparePages)

  const childrenByParent = new Map<string, NotePage[]>()
  for (const page of pages) {
    if (!page.parent_page_id) continue
    const list = childrenByParent.get(page.parent_page_id) ?? []
    list.push(page)
    childrenByParent.set(page.parent_page_id, list)
  }

  return topLevel.map((page) => ({
    ...page,
    children: (childrenByParent.get(page.id) ?? []).sort(comparePages),
  }))
}

/** Sort pages by sort_order then created_at */
function comparePages(a: NotePage, b: NotePage): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return a.created_at.localeCompare(b.created_at)
}

/**
 * Whether a subpage can be added under the given parent page id.
 */
export function canAddSubpage(parentPageId: string, pages: NotePage[]): boolean {
  const parent = pages.find((p) => p.id === parentPageId)
  return Boolean(parent && parent.parent_page_id === null)
}

/**
 * Default title for a new top-level page (Tab 1, Tab 2, …).
 */
export function getDefaultPageTitle(topLevelCount: number): string {
  return `Tab ${topLevelCount + 1}`
}

/**
 * Default title for a new subpage.
 */
export function getDefaultSubpageTitle(subpageCount: number): string {
  return `Subpage ${subpageCount + 1}`
}

/**
 * Group pages by note id for library search and previews.
 */
export function groupPagesByNoteId(pages: NotePage[]): Record<string, NotePage[]> {
  const map: Record<string, NotePage[]> = {}
  for (const page of pages) {
    if (!map[page.note_id]) map[page.note_id] = []
    map[page.note_id].push(page)
  }
  return map
}

/**
 * Pick the first top-level page id for initial selection.
 */
export function getDefaultSelectedPageId(pages: NotePage[]): string | null {
  const tree = buildPageTree(pages)
  return tree[0]?.id ?? null
}

/**
 * After deleting a page, pick the next best page to select.
 */
export function getPageIdAfterDelete(
  deletedPageId: string,
  pages: NotePage[],
): string | null {
  const deleted = pages.find((p) => p.id === deletedPageId)
  if (!deleted) return getDefaultSelectedPageId(pages)

  const remaining = pages.filter((p) => p.id !== deletedPageId)
  const tree = buildPageTree(remaining)

  if (deleted.parent_page_id) {
    const siblings = remaining.filter((p) => p.parent_page_id === deleted.parent_page_id)
    if (siblings.length > 0) return siblings[0].id
    return deleted.parent_page_id
  }

  return tree[0]?.id ?? null
}
