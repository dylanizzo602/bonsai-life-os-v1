/* instantiateNoteFromTemplate: Apply a template snapshot to an existing note document */
import { updateNote } from '../../../lib/supabase/notes'
import {
  createNotePage,
  deleteNotePage,
  getPagesForNote,
  updateNotePage,
} from '../../../lib/supabase/notePages'
import type { NoteTemplateData } from '../types'

const DEFAULT_PAGE_TITLE = 'Untitled'

/**
 * Apply template data to a note that already has at least one top-level page.
 * Returns the id of the first top-level page after apply.
 */
export async function instantiateNoteFromTemplate(
  noteId: string,
  data: NoteTemplateData,
): Promise<string> {
  const templatePages =
    data.pages.length > 0
      ? data.pages
      : [{ title: DEFAULT_PAGE_TITLE, content: '', subpages: [] }]

  /* Document title: use template title or fall back to first page title */
  const docTitle =
    data.title?.trim() ||
    templatePages[0]?.title?.trim() ||
    DEFAULT_PAGE_TITLE
  await updateNote(noteId, { title: docTitle })

  const existingPages = await getPagesForNote(noteId)
  const topLevelExisting = existingPages
    .filter((p) => p.parent_page_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  const firstExisting = topLevelExisting[0]
  if (!firstExisting) {
    throw new Error('Note has no top-level page to apply template to')
  }

  const firstTemplate = templatePages[0]

  /* Morph the first top-level page in place */
  await updateNotePage(firstExisting.id, {
    title: firstTemplate.title?.trim() || DEFAULT_PAGE_TITLE,
    content: firstTemplate.content ?? '',
  })

  /* Replace subpages on the first top-level page */
  const existingSubpages = existingPages.filter((p) => p.parent_page_id === firstExisting.id)
  for (const subpage of existingSubpages) {
    await deleteNotePage(subpage.id)
  }
  for (const sub of firstTemplate.subpages ?? []) {
    await createNotePage({
      note_id: noteId,
      parent_page_id: firstExisting.id,
      title: sub.title?.trim() || DEFAULT_PAGE_TITLE,
      content: sub.content ?? '',
    })
  }

  /* Remove extra existing top-level pages (delete subpages first) */
  for (const extraTop of topLevelExisting.slice(1)) {
    const subs = existingPages.filter((p) => p.parent_page_id === extraTop.id)
    for (const sub of subs) {
      await deleteNotePage(sub.id)
    }
    await deleteNotePage(extraTop.id)
  }

  /* Create additional top-level pages from the template */
  for (let i = 1; i < templatePages.length; i++) {
    const tmplPage = templatePages[i]
    const created = await createNotePage({
      note_id: noteId,
      title: tmplPage.title?.trim() || DEFAULT_PAGE_TITLE,
      content: tmplPage.content ?? '',
      sort_order: i,
    })
    for (const sub of tmplPage.subpages ?? []) {
      await createNotePage({
        note_id: noteId,
        parent_page_id: created.id,
        title: sub.title?.trim() || DEFAULT_PAGE_TITLE,
        content: sub.content ?? '',
      })
    }
  }

  return firstExisting.id
}
