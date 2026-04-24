/* Task import/export hook: Orchestrate parsing, exporting, and Supabase writes for Settings */
import { useCallback } from 'react'
import {
  getTasks,
  createTask,
  updateTask,
  createTaskChecklist,
  createChecklistItem,
  createTaskDependency,
  getTaskChecklists,
  getTaskChecklistItems,
  getTaskDependencies,
} from '../../../lib/supabase/tasks'
import { createTag, getTags, setTagsForTask } from '../../../lib/supabase/tags'
import type { TagColorId } from '../../tasks/types'
import type { CanonicalTaskRecord, TaskImportMapping, TaskImportParseError } from '../../tasks/utils/taskImportExport'
import {
  downloadTasksCsv,
  downloadTasksJson,
  exportTasksToCsv,
  parseTasksCsvFile,
  parseTasksJsonFile,
} from '../../tasks/utils/taskImportExport'

interface TaskImportSummary {
  totalRows: number
  createdTasks: number
  createdChecklists: number
  createdChecklistItems: number
  createdDependencies: number
  createdTags: number
  errors: string[]
}

/* Default tag color when an imported tag doesn't specify one */
const DEFAULT_TAG_COLOR: TagColorId = 'slate'

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
async function buildCanonicalRecordsForExport(): Promise<CanonicalTaskRecord[]> {
  /* Fetch all tasks and subtasks: includeAllTasks avoids parent_id filter */
  const all = await getTasks({ includeAllTasks: true })

  /* Stable order: sort by created_at asc so external ids are consistent per export */
  const sorted = [...all].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  /* External ids: use sequential ids (portable; no DB id leak) */
  const externalByTaskId = new Map<string, string>()
  sorted.forEach((t, idx) => externalByTaskId.set(t.id, `t_${idx + 1}`))

  /* Enrichment: fetch checklists/items + dependencies per task */
  const checklistByTaskId = new Map<string, Array<{ title: string; items: Array<{ title: string; completed: boolean; sort_order?: number }> }>>()
  const depsByTaskId = new Map<string, { blocked_by: Array<{ blocker_external_id: string }>; blocking: Array<{ blocked_external_id: string }> }>()

  await Promise.all(
    sorted.map(async (t) => {
      const [checklists, deps] = await Promise.all([
        (async () => {
          const cls = await getTaskChecklists(t.id)
          const out: Array<{ title: string; items: Array<{ title: string; completed: boolean; sort_order?: number }> }> = []
          for (const cl of cls) {
            const items = await getTaskChecklistItems(cl.id)
            out.push({
              title: cl.title,
              items: items.map((it) => ({ title: it.title, completed: it.completed, sort_order: it.sort_order })),
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

  /* Canonical record assembly */
  return sorted.map((t) => {
    const external_id = externalByTaskId.get(t.id) ?? `t_${t.id}`
    const parent_external_id = t.parent_id ? externalByTaskId.get(t.parent_id) ?? null : null
    return {
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
 * Keeps Supabase calls out of the Settings page component.
 */
export function useTaskImportExport() {
  /* Export: JSON full-fidelity (nested subtasks) */
  const exportJson = useCallback(async () => {
    const records = await buildCanonicalRecordsForExport()
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      tasks: buildNestedExportTasks(records),
    }
    downloadTasksJson('tasks-export.json', payload)
  }, [])

  /* Export: CSV (flat rows; nested structures in JSON-in-cells columns) */
  const exportCsv = useCallback(async () => {
    const records = await buildCanonicalRecordsForExport()
    downloadTasksCsv('tasks-export.csv', records)
  }, [])

  /* Import: parse mapping JSON file */
  const parseMappingFile = useCallback(async (file: File): Promise<{ mapping: TaskImportMapping | null; error: string | null }> => {
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
  }, [])

  /* Import: parse tasks file (CSV or JSON) to canonical records */
  const parseTasksFile = useCallback(
    async (file: File, mapping?: TaskImportMapping): Promise<{ records: CanonicalTaskRecord[]; errors: TaskImportParseError[]; totalRows: number }> => {
      const name = file.name.toLowerCase()
      if (name.endsWith('.csv')) {
        const res = await parseTasksCsvFile(file, mapping)
        return { records: res.records, errors: res.errors, totalRows: res.totalRows }
      }
      if (name.endsWith('.json')) {
        const res = await parseTasksJsonFile(file, mapping)
        return { records: res.records, errors: res.errors, totalRows: res.records.length }
      }
      return { records: [], errors: [{ message: 'Unsupported file type. Please upload a .csv or .json file.' }], totalRows: 0 }
    },
    [],
  )

  /* Import: write canonical records into Supabase in a safe order */
  const importTasks = useCallback(
    async (records: CanonicalTaskRecord[]): Promise<TaskImportSummary> => {
      /* Summary bookkeeping: track created counts and errors */
      const summary: TaskImportSummary = {
        totalRows: records.length,
        createdTasks: 0,
        createdChecklists: 0,
        createdChecklistItems: 0,
        createdDependencies: 0,
        createdTags: 0,
        errors: [],
      }

      /* Tags: build name → id map, creating missing tags on demand */
      const existingTags = await getTags()
      const tagIdByName = new Map<string, string>()
      for (const t of existingTags) tagIdByName.set(t.name, t.id)

      const ensureTagIds = async (tags: Array<{ name: string; color?: TagColorId }>): Promise<string[]> => {
        const ids: string[] = []
        for (const tag of tags) {
          const name = (tag.name ?? '').trim()
          if (!name) continue
          const existingId = tagIdByName.get(name)
          if (existingId) {
            ids.push(existingId)
            continue
          }
          const created = await createTag(name, tag.color ?? DEFAULT_TAG_COLOR)
          tagIdByName.set(created.name, created.id)
          summary.createdTags += 1
          ids.push(created.id)
        }
        /* Enforce max 3 tags per task */
        return ids.slice(0, 3)
      }

      /* Task creation: resolve external ids to new Supabase ids */
      const supabaseIdByExternal = new Map<string, string>()
      const pending = [...records]

      /* Loop until all records are created or we cannot make progress (cycle/missing parents) */
      let guard = 0
      while (pending.length > 0 && guard < records.length + 5) {
        guard += 1
        let progressed = false

        for (let i = 0; i < pending.length; i++) {
          const r = pending[i]
          const parentExternal = r.parent_external_id
          const parentId = parentExternal ? supabaseIdByExternal.get(parentExternal) : null
          if (parentExternal && !parentId) continue

          try {
            /* Task row: create core fields; category is applied with update after create */
            const created = await createTask({
              title: r.title,
              description: r.description ?? null,
              start_date: r.start_date ?? null,
              due_date: r.due_date ?? null,
              priority: r.priority ?? 'medium',
              time_estimate: r.time_estimate ?? null,
              attachments: r.attachments ?? [],
              status: r.status ?? 'active',
              recurrence_pattern: r.recurrence_pattern ?? null,
              parent_id: parentId,
            })

            supabaseIdByExternal.set(r.external_id, created.id)
            summary.createdTasks += 1

            /* Category: not supported by createTask input; apply via update when present */
            if (r.category != null && r.category.trim()) {
              await updateTask(created.id, { category: r.category })
            }

            /* Tags: create missing tags and assign (max 3) */
            const tagIds = await ensureTagIds(r.tags ?? [])
            if (tagIds.length > 0) {
              await setTagsForTask(created.id, tagIds)
            }

            /* Checklists + items */
            for (const cl of r.checklists ?? []) {
              const checklist = await createTaskChecklist({ task_id: created.id, title: cl.title, sort_order: 0 })
              summary.createdChecklists += 1
              for (const item of cl.items ?? []) {
                await createChecklistItem({
                  checklist_id: checklist.id,
                  title: item.title,
                  sort_order: item.sort_order ?? 0,
                })
                summary.createdChecklistItems += 1
              }
            }

            /* Remove from pending */
            pending.splice(i, 1)
            i -= 1
            progressed = true
          } catch (err) {
            summary.errors.push(
              err instanceof Error
                ? `Failed to import "${r.title}": ${err.message}`
                : `Failed to import "${r.title}".`,
            )
            /* Remove failed row to avoid infinite loops */
            pending.splice(i, 1)
            i -= 1
          }
        }

        if (!progressed) break
      }

      /* Unresolved parents/cycles: report remaining pending items */
      if (pending.length > 0) {
        for (const r of pending) {
          summary.errors.push(
            `Skipped "${r.title}" because its parent external_id "${r.parent_external_id ?? ''}" was not imported.`,
          )
        }
      }

      /* Dependencies: create edges once all tasks exist; dedupe blocker|blocked */
      const seenEdges = new Set<string>()
      for (const r of records) {
        const blockedId = supabaseIdByExternal.get(r.external_id)
        if (!blockedId) continue

        const addEdge = async (blockerExternal: string, blockedExternal: string) => {
          const blockerId = supabaseIdByExternal.get(blockerExternal)
          const blockedIdResolved = supabaseIdByExternal.get(blockedExternal)
          if (!blockerId || !blockedIdResolved) return
          const key = `${blockerId}|${blockedIdResolved}`
          if (seenEdges.has(key)) return
          seenEdges.add(key)
          await createTaskDependency({ blocker_id: blockerId, blocked_id: blockedIdResolved })
          summary.createdDependencies += 1
        }

        for (const b of r.dependencies?.blocked_by ?? []) {
          await addEdge(b.blocker_external_id, r.external_id)
        }
        for (const b of r.dependencies?.blocking ?? []) {
          await addEdge(r.external_id, b.blocked_external_id)
        }
      }

      return summary
    },
    [],
  )

  /* Convenience: parse + import in one call */
  const importFromFile = useCallback(
    async (file: File, mapping?: TaskImportMapping): Promise<{ summary: TaskImportSummary; parseErrors: TaskImportParseError[]; csvPreviewText?: string }> => {
      const { records, errors, totalRows } = await parseTasksFile(file, mapping)
      if (errors.length > 0) {
        return {
          summary: {
            totalRows,
            createdTasks: 0,
            createdChecklists: 0,
            createdChecklistItems: 0,
            createdDependencies: 0,
            createdTags: 0,
            errors: errors.map((e) => (e.rowNumber ? `Row ${e.rowNumber}: ${e.message}` : e.message)),
          },
          parseErrors: errors,
        }
      }

      /* Import: write to Supabase */
      const summary = await importTasks(records)
      return { summary, parseErrors: [] }
    },
    [importTasks, parseTasksFile],
  )

  /* Convenience: export canonical CSV string (used for diagnostics/tests) */
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

