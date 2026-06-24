/* Reflection import/export hook for Settings */
import { useCallback } from 'react'
import {
  bulkImportReflectionEntries,
  getAllReflectionEntriesForExport,
} from '../../../lib/supabase/reflections'
import { saveImportRevertBatch } from '../../../lib/supabase/importRevert'
import {
  downloadCsv,
  exportReflectionEntriesToCsv,
  parseReflectionCsvFile,
} from '../../reflections/utils/reflectionCsv'
import type { ImportMode } from '../types/importExport'

export interface ReflectionImportSummary {
  totalRows: number
  createdCount: number
  updatedCount: number
  errorCount: number
  errors: string[]
}

export function useReflectionImportExport() {
  const exportCsv = useCallback(async () => {
    const all = await getAllReflectionEntriesForExport()
    const csvText = exportReflectionEntriesToCsv(all)
    downloadCsv('reflections-export.csv', csvText)
  }, [])

  const importFromFile = useCallback(
    async (file: File, mode: ImportMode = 'create'): Promise<ReflectionImportSummary> => {
      const { rows, errors, totalRows } = await parseReflectionCsvFile(file)
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

      const importResult = await bulkImportReflectionEntries(
        rows.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          responses: r.responses,
          created_at: r.created_at,
        })),
        mode,
      )

      if (
        importResult.createdIds.length > 0 ||
        importResult.updatedSnapshots.length > 0
      ) {
        await saveImportRevertBatch({
          entity_type: 'reflections',
          import_mode: mode,
          summary: {
            createdCount: importResult.createdIds.length,
            updatedCount: importResult.updatedSnapshots.length,
            fileName: file.name,
          },
          payload: {
            kind: 'reflections',
            createdEntryIds: importResult.createdIds,
            updatedEntrySnapshots: importResult.updatedSnapshots,
          },
        })
      }

      return {
        totalRows,
        createdCount: importResult.createdIds.length,
        updatedCount: importResult.updatedSnapshots.length,
        errorCount: errorMessages.length,
        errors: errorMessages,
      }
    },
    [],
  )

  return { exportCsv, importFromFile }
}
