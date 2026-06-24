/* Task import/export hook: Orchestrate parsing, exporting, and Supabase writes for Settings */
import { useCallback } from 'react'
import {
  getTasks,
  getTaskChecklists,
  getTaskChecklistItems,
  getTaskDependencies,
} from '../../../lib/supabase/tasks'
import { getGoals } from '../../../lib/supabase/goals'
import { getHabits } from '../../../lib/supabase/habits'
import { getMilestoneLinksForTaskIds } from '../../../lib/supabase/goals'
import { saveImportRevertBatch } from '../../../lib/supabase/importRevert'
import type {
  CanonicalTaskRecord,
  TaskImportMapping,
  TaskImportParseError,
} from '../../tasks/utils/taskImportExport'
import {
  downloadTasksCsv,
  downloadTasksJson,
  exportTasksToCsv,
  parseTasksCsvFile,
  parseTasksJsonFile,
  validateUniqueExternalIds,
} from '../../tasks/utils/taskImportExport'
import type { ImportMode } from '../types/importExport'
import { runTaskImport } from '../utils/runTaskImport'

export interface TaskImportSummary {
  totalRows: number
  createdTasks: number
  updatedTasks: number
  createdChecklists: number
  createdChecklistItems: number
  createdDependencies: number
  createdTags: number
  errors: string[]
  warnings: string[]
}

/* Utility: flatten array of records into a parent→children map by external ids */
function buildChildrenByExternalId(records: CanonicalTaskRecord[]): Map<string | null, CanonicalTaskRecord[]> {
  const map = new Map<string | null, CanonicalTaskRecord[]>()
  for (const r of records) {
    const key = r.parent_external_id ?? null
    const list = map.get(key) ?? []
    list.push(r)
    map.set(key, list)
  }
  return map
}

/* Utility: build nested JSON export shape from flat canonical records */
function buildNestedExportTasks(records: CanonicalTaskRecord[]): unknown[] {
  const childrenByParent = buildChildrenByExternalId(records)

  const buildNode = (r: CanonicalTaskRecord): Record<string, unknown> => ({
    id: r.id ?? null,
    external_id: r.external_id,
    title: r.title,
    description: r.description,
    start_date: r.start_date,
    due_date: r.due_date,
    priority: r.priority,
    status: r.status,
    category: r.category,
    time_estimate: r.time_estimate,
    recurrence_pattern: r.recurrence_pattern,
    completed_at: r.completed_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    goal_title: r.goal_title,
    habit_name: r.habit_name,
    milestone_links: r.milestone_links ?? [],
    attachments: r.attachments ?? [],
    tags: r.tags ?? [],
    checklists: r.checklists ?? [],
    dependencies: r.dependencies ?? { blocked_by: [], blocking: [] },
    subtasks: (childrenByParent.get(r.external_id) ?? []).map(buildNode),
  })

  const roots = childrenByParent.get(null) ?? []
  return roots.map(buildNode)
}

/* Utility: build canonical records from current Supabase tasks (including enrichment) */
export async function buildCanonicalRecordsForExport(): Promise<CanonicalTaskRecord[]> {
  const all = await getTasks({ includeAllTasks: true })
  const sorted = [...all].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const externalByTaskId = new Map<string, string>()
  sorted.forEach((t, idx) => externalByTaskId.set(t.id, `t_${idx + 1}`))

  const [goals, habits, milestoneLinks] = await Promise.all([
    getGoals(),
    getHabits(),
    getMilestoneLinksForTaskIds(sorted.map((t) => t.id)),
  ])

  const goalTitleById = new Map(goals.map((g) => [g.id, g.name]))
  const habitNameById = new Map(habits.map((h) => [h.id, h.name]))
  const milestoneLinksByTaskId = new Map<string, CanonicalTaskRecord['milestone_links']>()
  for (const link of milestoneLinks) {
    const list = milestoneLinksByTaskId.get(link.task_id) ?? []
    list.push({
      goal_title: link.goal_title,
      milestone_title: link.milestone_title,
      sort_order: link.sort_order,
    })
    milestoneLinksByTaskId.set(link.task_id, list)
  }

  const checklistByTaskId = new Map<
    string,
    CanonicalTaskRecord['checklists']
  >()
  const depsByTaskId = new Map<
    string,
    CanonicalTaskRecord['dependencies']
  >()

  await Promise.all(
    sorted.map(async (t) => {
      const [checklists, deps] = await Promise.all([
        (async () => {
          const cls = await getTaskChecklists(t.id)
          const out: CanonicalTaskRecord['checklists'] = []
          for (const cl of cls) {
            const items = await getTaskChecklistItems(cl.id)
            out.push({
              title: cl.title,
              sort_order: cl.sort_order,
              items: items.map((it) => ({
                title: it.title,
                completed: it.completed,
                sort_order: it.sort_order,
              })),
            })
          }
          return out
        })(),
        getTaskDependencies(t.id),
      ])

      checklistByTaskId.set(t.id, checklists)

      const blocked_by = deps.blockedBy
        .map((d) => {
          const ext = externalByTaskId.get(d.blocker_id)
          return ext ? { blocker_external_id: ext } : null
        })
        .filter((x): x is { blocker_external_id: string } => x != null)

      const blocking = deps.blocking
        .map((d) => {
          const ext = externalByTaskId.get(d.blocked_id)
          return ext ? { blocked_external_id: ext } : null
        })
        .filter((x): x is { blocked_external_id: string } => x != null)

      depsByTaskId.set(t.id, { blocked_by, blocking })
    }),
  )

  return sorted.map((t) => {
    const external_id = externalByTaskId.get(t.id) ?? `t_${t.id}`
    const parent_external_id = t.parent_id
      ? externalByTaskId.get(t.parent_id) ?? null
      : null
    return {
      id: t.id,
      external_id,
      parent_external_id,
      title: t.title ?? '',
      description: t.description ?? null,
      start_date: t.start_date ?? null,
      due_date: t.due_date ?? null,
      priority: t.priority,
      status: t.status,
      category: t.category ?? null,
      time_estimate: t.time_estimate ?? null,
      recurrence_pattern: t.recurrence_pattern ?? null,
      completed_at: t.completed_at ?? null,
      created_at: t.created_at ?? null,
      updated_at: t.updated_at ?? null,
      goal_title: t.goal_id ? goalTitleById.get(t.goal_id) ?? null : null,
      habit_name: t.habit_id ? habitNameById.get(t.habit_id) ?? null : null,
      milestone_links: milestoneLinksByTaskId.get(t.id) ?? [],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      tags: (t.tags ?? []).map((tag) => ({ name: tag.name, color: tag.color })),
      checklists: checklistByTaskId.get(t.id) ?? [],
      dependencies: depsByTaskId.get(t.id) ?? { blocked_by: [], blocking: [] },
      extra: {},
    }
  })
}

/**
 * Hook for task import/export in settings.
 */
export function useTaskImportExport() {
  const exportJson = useCallback(async () => {
    const records = await buildCanonicalRecordsForExport()
    const payload = {
      version: 2,
      exported_at: new Date().toISOString(),
      tasks: buildNestedExportTasks(records),
    }
    downloadTasksJson('tasks-export.json', payload)
  }, [])

  const exportCsv = useCallback(async () => {
    const records = await buildCanonicalRecordsForExport()
    downloadTasksCsv('tasks-export.csv', records)
  }, [])

  const parseMappingFile = useCallback(
    async (file: File): Promise<{ mapping: TaskImportMapping | null; error: string | null }> => {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { mapping: null, error: 'Mapping file must be a JSON object.' }
        }
        return { mapping: parsed as TaskImportMapping, error: null }
      } catch {
        return { mapping: null, error: 'Mapping file must be valid JSON.' }
      }
    },
    [],
  )

  const parseTasksFile = useCallback(
    async (
      file: File,
      mapping?: TaskImportMapping,
    ): Promise<{ records: CanonicalTaskRecord[]; errors: TaskImportParseError[]; totalRows: number }> => {
      const name = file.name.toLowerCase()
      if (name.endsWith('.csv')) {
        const res = await parseTasksCsvFile(file, mapping)
        return { records: res.records, errors: res.errors, totalRows: res.totalRows }
      }
      if (name.endsWith('.json')) {
        const res = await parseTasksJsonFile(file, mapping)
        return { records: res.records, errors: res.errors, totalRows: res.records.length }
      }
      return {
        records: [],
        errors: [{ message: 'Unsupported file type. Please upload a .csv or .json file.' }],
        totalRows: 0,
      }
    },
    [],
  )

  const importFromFile = useCallback(
    async (
      file: File,
      options?: { mapping?: TaskImportMapping; mode?: ImportMode },
    ): Promise<{ summary: TaskImportSummary; parseErrors: TaskImportParseError[] }> => {
      const mode = options?.mode ?? 'create'
      const { records, errors, totalRows } = await parseTasksFile(file, options?.mapping)

      const dupErrors = validateUniqueExternalIds(records)
      const parseErrorMessages = [...errors, ...dupErrors].map((e) =>
        e.rowNumber ? `Row ${e.rowNumber}: ${e.message}` : e.message,
      )

      if (records.length === 0) {
        return {
          summary: {
            totalRows,
            createdTasks: 0,
            updatedTasks: 0,
            createdChecklists: 0,
            createdChecklistItems: 0,
            createdDependencies: 0,
            createdTags: 0,
            errors: parseErrorMessages,
            warnings: [],
          },
          parseErrors: [...errors, ...dupErrors],
        }
      }

      const importResult = await runTaskImport(records, mode)
      const allErrors = [...parseErrorMessages, ...importResult.errors]
      const summary: TaskImportSummary = {
        totalRows,
        createdTasks: importResult.createdTasks,
        updatedTasks: importResult.updatedTasks,
        createdChecklists: importResult.createdChecklists,
        createdChecklistItems: importResult.createdChecklistItems,
        createdDependencies: importResult.createdDependencies,
        createdTags: importResult.createdTags,
        errors: allErrors,
        warnings: importResult.warnings,
      }

      if (importResult.revertPayload) {
        await saveImportRevertBatch({
          entity_type: 'tasks',
          import_mode: mode,
          summary: {
            createdCount: importResult.createdTasks,
            updatedCount: importResult.updatedTasks,
            fileName: file.name,
          },
          payload: importResult.revertPayload,
        })
      }

      return { summary, parseErrors: [...errors, ...dupErrors] }
    },
    [parseTasksFile],
  )

  const exportCsvText = useCallback(async () => {
    const records = await buildCanonicalRecordsForExport()
    return exportTasksToCsv(records)
  }, [])

  return {
    exportJson,
    exportCsv,
    exportCsvText,
    parseMappingFile,
    parseTasksFile,
    importFromFile,
  }
}
