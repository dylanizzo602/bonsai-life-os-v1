/* useNoteTemplates hook: Load, create, apply, and delete per-user note templates */
import { useState, useCallback } from 'react'
import {
  getNoteTemplates,
  createNoteTemplate,
  updateNoteTemplate,
  deleteNoteTemplate,
} from '../../../lib/supabase/noteTemplates'
import type { Note, NotePage, NoteTemplate, NoteTemplateData } from '../types'
import type { NoteTemplateDraft, NoteTemplateIncludedFields } from '../utils/noteTemplateData'
import {
  buildTemplateDataFromDraft,
  buildTemplateDataFromPages,
  filterTemplateDataByIncludedFields,
  getSelectedTopLevelPageIndex,
} from '../utils/noteTemplateData'
import { instantiateNoteFromTemplate } from '../utils/instantiateNoteFromTemplate'

interface UseNoteTemplatesResult {
  templates: NoteTemplate[]
  loading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  saveTemplateFromNote: (args: {
    name: string
    icon?: string | null
    included?: NoteTemplateIncludedFields
    note: Note
    pages: NotePage[]
    selectedPageId?: string | null
  }) => Promise<NoteTemplate>
  saveTemplateFromDraft: (args: {
    name: string
    icon?: string | null
    included?: NoteTemplateIncludedFields
    draft: NoteTemplateDraft
  }) => Promise<NoteTemplate>
  overwriteTemplateFromNote: (args: {
    id: string
    name?: string
    icon?: string | null
    included?: NoteTemplateIncludedFields
    note: Note
    pages: NotePage[]
    selectedPageId?: string | null
  }) => Promise<NoteTemplate>
  overwriteTemplateFromDraft: (args: {
    id: string
    name?: string
    icon?: string | null
    included?: NoteTemplateIncludedFields
    draft: NoteTemplateDraft
  }) => Promise<NoteTemplate>
  removeTemplate: (id: string) => Promise<void>
  applyTemplateToNote: (noteId: string, data: NoteTemplateData) => Promise<string>
}

export function useNoteTemplates(): UseNoteTemplatesResult {
  const [templates, setTemplates] = useState<NoteTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Fetch all templates for the current user */
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getNoteTemplates()
      setTemplates(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load note templates'
      setError(message)
      console.error('Error fetching note templates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Create a new template from a persisted note and its pages */
  const saveTemplateFromNote = useCallback(
    async (args: {
      name: string
      icon?: string | null
      included?: NoteTemplateIncludedFields
      note: Note
      pages: NotePage[]
      selectedPageId?: string | null
    }): Promise<NoteTemplate> => {
      try {
        setError(null)
        const raw = buildTemplateDataFromPages(args.note.title, args.pages, args.selectedPageId)
        const selectedIndex = getSelectedTopLevelPageIndex(args.pages, args.selectedPageId ?? null)
        const filtered = args.included
          ? filterTemplateDataByIncludedFields(raw, args.included, selectedIndex)
          : raw
        const created = await createNoteTemplate({
          name: args.name,
          icon: args.icon ?? null,
          data: filtered,
        })
        setTemplates((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save note template'
        setError(message)
        console.error('Error creating note template:', err)
        throw err
      }
    },
    [],
  )

  /* Create a new template from current draft UI state */
  const saveTemplateFromDraft = useCallback(
    async (args: {
      name: string
      icon?: string | null
      included?: NoteTemplateIncludedFields
      draft: NoteTemplateDraft
    }): Promise<NoteTemplate> => {
      try {
        setError(null)
        const data = buildTemplateDataFromDraft(args.draft, args.included)
        const created = await createNoteTemplate({
          name: args.name,
          icon: args.icon ?? null,
          data,
        })
        setTemplates((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save note template'
        setError(message)
        console.error('Error creating note template from draft:', err)
        throw err
      }
    },
    [],
  )

  /* Overwrite an existing template from a persisted note */
  const overwriteTemplateFromNote = useCallback(
    async (args: {
      id: string
      name?: string
      icon?: string | null
      included?: NoteTemplateIncludedFields
      note: Note
      pages: NotePage[]
      selectedPageId?: string | null
    }): Promise<NoteTemplate> => {
      try {
        setError(null)
        const raw = buildTemplateDataFromPages(args.note.title, args.pages, args.selectedPageId)
        const selectedIndex = getSelectedTopLevelPageIndex(args.pages, args.selectedPageId ?? null)
        const filtered = args.included
          ? filterTemplateDataByIncludedFields(raw, args.included, selectedIndex)
          : raw
        const updated = await updateNoteTemplate(args.id, {
          name: args.name,
          icon: args.icon,
          data: filtered,
        })
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to overwrite note template'
        setError(message)
        console.error('Error overwriting note template:', err)
        throw err
      }
    },
    [],
  )

  /* Overwrite an existing template from draft UI state */
  const overwriteTemplateFromDraft = useCallback(
    async (args: {
      id: string
      name?: string
      icon?: string | null
      included?: NoteTemplateIncludedFields
      draft: NoteTemplateDraft
    }): Promise<NoteTemplate> => {
      try {
        setError(null)
        const data = buildTemplateDataFromDraft(args.draft, args.included)
        const updated = await updateNoteTemplate(args.id, {
          name: args.name,
          icon: args.icon,
          data,
        })
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to overwrite note template'
        setError(message)
        console.error('Error overwriting note template from draft:', err)
        throw err
      }
    },
    [],
  )

  /* Delete a template by id and update local state */
  const removeTemplate = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteNoteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note template'
      setError(message)
      console.error('Error deleting note template:', err)
      throw err
    }
  }, [])

  /* Apply template snapshot to an existing note document */
  const applyTemplateToNote = useCallback(
    async (noteId: string, data: NoteTemplateData): Promise<string> => {
      try {
        setError(null)
        return await instantiateNoteFromTemplate(noteId, data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to apply note template'
        setError(message)
        console.error('Error applying note template:', err)
        throw err
      }
    },
    [],
  )

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    saveTemplateFromNote,
    saveTemplateFromDraft,
    overwriteTemplateFromNote,
    overwriteTemplateFromDraft,
    removeTemplate,
    applyTemplateToNote,
  }
}
