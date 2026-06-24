/* Notes import/export hook for Settings */
import { useCallback } from 'react'
import {
  bulkImportNotesFromCsv,
  getAllNotesForExport,
} from '../../../lib/supabase/notes'
import { saveImportRevertBatch } from '../../../lib/supabase/importRevert'
import {
  downloadNotesCsv,
  exportNotesToCsv,
  parseNotesCsvFile,
} from '../../notes/utils/noteCsv'
import type { ImportMode } from '../types/importExport'

export interface NoteImportSummary {
  totalRows: number
  createdCount: number
  updatedCount: number
  errorCount: number
  errors: string[]
}

export function useNoteImportExport() {
  const exportCsv = useCallback(async () => {
    const bundles = await getAllNotesForExport()
    const csvText = exportNotesToCsv(
      bundles.map((b) => ({
        id: b.note.id,
        title: b.note.title,
        page_title: b.page_title,
        content: b.content,
        cover_image_url: b.note.cover_image_url,
        created_at: b.note.created_at,
        updated_at: b.note.updated_at,
      })),
    )
    downloadNotesCsv('notes-export.csv', csvText)
  }, [])

  const importFromFile = useCallback(
    async (file: File, mode: ImportMode = 'create'): Promise<NoteImportSummary> => {
      const { rows, errors, totalRows } = await parseNotesCsvFile(file)
      const errorMessages = errors.map((e) =>
        e.rowNumber ? `Row ${e.rowNumber}: ${e.message}` : e.message,
      )

      if (rows.length === 0) {
        return {
          totalRows,
          createdCount: 0,
          updatedCount: 0,
          errorCount: errorMessages.length,
          errors: errorMessages,
        }
      }

      const importResult = await bulkImportNotesFromCsv(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          page_title: r.page_title,
          content: r.content,
          cover_image_url: r.cover_image_url,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
        mode,
      )

      if (
        importResult.createdNoteIds.length > 0 ||
        importResult.updatedSnapshots.length > 0
      ) {
        await saveImportRevertBatch({
          entity_type: 'notes',
          import_mode: mode,
          summary: {
            createdCount: importResult.createdNoteIds.length,
            updatedCount: importResult.updatedSnapshots.length,
            fileName: file.name,
          },
          payload: {
            kind: 'notes',
            createdNoteIds: importResult.createdNoteIds,
            updatedNoteSnapshots: importResult.updatedSnapshots,
          },
        })
      }

      return {
        totalRows,
        createdCount: importResult.createdNoteIds.length,
        updatedCount: importResult.updatedSnapshots.length,
        errorCount: errorMessages.length,
        errors: errorMessages,
      }
    },
    [],
  )

  return { exportCsv, importFromFile }
}
