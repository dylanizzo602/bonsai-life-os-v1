/* Task import/export utils: Parse and serialize tasks (JSON + CSV) with optional schema mapping */
import Papa from 'papaparse'
import type {
  TaskAttachment,
  TaskPriority,
  TaskStatus,
  TagColorId,
} from '../types'

/* CSV schema: stable headers for the tasks import template */
export const TASKS_CSV_HEADERS = [
  'external_id',
  'parent_external_id',
  'title',
  'description',
  'start_date',
  'due_date',
  'priority',
  'status',
  'category',
  'time_estimate',
  'recurrence_pattern',
  'attachments_json',
  'tags_csv',
  'checklists_json',
  'dependencies_json',
  'extra_json',
] as const

export type TasksCsvHeader = (typeof TASKS_CSV_HEADERS)[number]

/* Import/export mapping: allow users to map foreign keys/headers to canonical schema */
export interface TaskImportMapping {
  version?: number
  json?: {
    /** Dot path to the array of items in the JSON payload; default: "tasks" */
    itemsPath?: string
    /** Canonical-field → input-field mapping (e.g. title → "name") */
    fields?: Record<string, string>
  }
  csv?: {
    /** Canonical-header → input-header mapping (e.g. title → "Name") */
    headers?: Record<string, string>
  }
}

/* Canonical dependency payload: uses external ids so it is portable across accounts */
export type CanonicalDependencies = {
  blocked_by: Array<{ blocker_external_id: string }>
  blocking: Array<{ blocked_external_id: string }>
}

/* Canonical checklist payload: portable without DB foreign keys */
export type CanonicalChecklist = {
  title: string
  items: Array<{ title: string; completed: boolean; sort_order?: number }>
}

/* Canonical tag payload: uses name + color so it can be recreated on import */
export type CanonicalTag = { name: string; color?: TagColorId }

/* Canonical task record used by import/export and mapping */
export interface CanonicalTaskRecord {
  external_id: string
  parent_external_id: string | null
  title: string
  description: string | null
  start_date: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  category: string | null
  time_estimate: number | null
  recurrence_pattern: string | null
  attachments: TaskAttachment[]
  tags: CanonicalTag[]
  checklists: CanonicalChecklist[]
  dependencies: CanonicalDependencies
  /** Extra/unknown fields preserved in memory for diagnostics; ignored by importer by default */
  extra: Record<string, unknown>
}

export interface TaskImportParseError {
  rowNumber?: number
  message: string
}

/* Parse helper: ensure a value is a trimmed string */
function normalizeCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

/* Parse helper: parse JSON safely, returning undefined on invalid JSON */
function safeJsonParse(value: string): unknown | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return undefined
  }
}

/* Validation helper: ensure strings are one of allowed options */
function coerceEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T
  return fallback
}

/* Normalization helper: parse optional number */
function parseOptionalNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const s = normalizeCell(value)
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/* Normalization helper: parse JSON array or return [] */
function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const parsed = safeJsonParse(value)
    return Array.isArray(parsed) ? parsed : []
  }
  return []
}

/* Normalization helper: parse JSON object or return {} */
function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === 'string') {
    const parsed = safeJsonParse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  }
  return {}
}

/* Mapping helper: get an object value by key (supports missing keys and returns undefined) */
function pickMappedValue(
  input: Record<string, unknown>,
  canonicalKey: string,
  mapping?: Record<string, string>,
): unknown {
  const sourceKey = mapping?.[canonicalKey] ?? canonicalKey
  return input[sourceKey]
}

/* JSON helper: read the array at itemsPath (dot-separated); default path is "tasks" */
function getJsonItemsAtPath(payload: unknown, itemsPath?: string): unknown[] {
  const path = (itemsPath ?? 'tasks').trim() || 'tasks'
  const parts = path.split('.').filter(Boolean)
  let current: unknown = payload
  for (const p of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return []
    current = (current as Record<string, unknown>)[p]
  }
  return Array.isArray(current) ? current : []
}

/* Canonical coercion: convert unknown record into CanonicalTaskRecord */
function coerceCanonicalRecord(
  input: Record<string, unknown>,
  defaults: { externalIdFallback: string; parentExternalId: string | null },
  mapping?: Record<string, string>,
  extraFromInput?: Record<string, unknown>,
): CanonicalTaskRecord {
  /* Core fields: mapped with sensible fallbacks */
  const external_id = normalizeCell(pickMappedValue(input, 'external_id', mapping)) || defaults.externalIdFallback
  const parent_external_idRaw = pickMappedValue(input, 'parent_external_id', mapping)
  const parent_external_id =
    normalizeCell(parent_external_idRaw) ? normalizeCell(parent_external_idRaw) : defaults.parentExternalId

  const title = normalizeCell(pickMappedValue(input, 'title', mapping))
  const descriptionRaw = pickMappedValue(input, 'description', mapping)
  const description = normalizeCell(descriptionRaw) ? normalizeCell(descriptionRaw) : null

  const startRaw = pickMappedValue(input, 'start_date', mapping)
  const start_date = normalizeCell(startRaw) ? normalizeCell(startRaw) : null
  const dueRaw = pickMappedValue(input, 'due_date', mapping)
  const due_date = normalizeCell(dueRaw) ? normalizeCell(dueRaw) : null

  const priority = coerceEnum<TaskPriority>(pickMappedValue(input, 'priority', mapping), ['none', 'low', 'medium', 'high', 'urgent'] as const, 'medium')
  const status = coerceEnum<TaskStatus>(pickMappedValue(input, 'status', mapping), ['active', 'in_progress', 'completed', 'archived', 'deleted'] as const, 'active')

  const categoryRaw = pickMappedValue(input, 'category', mapping)
  const category = normalizeCell(categoryRaw) ? normalizeCell(categoryRaw) : null
  const time_estimate = parseOptionalNumber(pickMappedValue(input, 'time_estimate', mapping))

  const recurrenceRaw = pickMappedValue(input, 'recurrence_pattern', mapping)
  const recurrence_pattern = normalizeCell(recurrenceRaw) ? normalizeCell(recurrenceRaw) : null

  /* Nested fields: accept canonical objects or JSON-string columns (CSV) */
  const attachmentsValue = pickMappedValue(input, 'attachments', mapping) ?? pickMappedValue(input, 'attachments_json', mapping)
  const attachmentsArray = parseJsonArray(attachmentsValue)
  const attachments: TaskAttachment[] = attachmentsArray
    .map((a) => (a && typeof a === 'object' && !Array.isArray(a) ? (a as TaskAttachment) : null))
    .filter((a): a is TaskAttachment => Boolean(a && typeof a.url === 'string' && a.url))

  const tagsValue = pickMappedValue(input, 'tags', mapping)
  const tags_csvValue = pickMappedValue(input, 'tags_csv', mapping)
  const tags: CanonicalTag[] = Array.isArray(tagsValue)
    ? (tagsValue as unknown[]).map((t) => (t && typeof t === 'object' && !Array.isArray(t) ? (t as CanonicalTag) : null)).filter((t): t is CanonicalTag => Boolean(t && t.name))
    : normalizeCell(tags_csvValue)
      ? normalizeCell(tags_csvValue)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name }))
      : []

  const checklistsValue = pickMappedValue(input, 'checklists', mapping) ?? pickMappedValue(input, 'checklists_json', mapping)
  const checklistsArray = parseJsonArray(checklistsValue)
  const checklists: CanonicalChecklist[] = checklistsArray
    .map((c) => (c && typeof c === 'object' && !Array.isArray(c) ? (c as CanonicalChecklist) : null))
    .filter((c): c is CanonicalChecklist => Boolean(c && typeof c.title === 'string'))

  const depsValue = pickMappedValue(input, 'dependencies', mapping) ?? pickMappedValue(input, 'dependencies_json', mapping)
  const depsObj = parseJsonObject(depsValue)
  const dependencies: CanonicalDependencies = {
    blocked_by: Array.isArray(depsObj.blocked_by)
      ? (depsObj.blocked_by as unknown[])
          .map((d) => (d && typeof d === 'object' && !Array.isArray(d) ? (d as { blocker_external_id?: string }) : null))
          .filter((d): d is { blocker_external_id: string } => Boolean(d && typeof d.blocker_external_id === 'string' && d.blocker_external_id))
          .map((d) => ({ blocker_external_id: d.blocker_external_id }))
      : [],
    blocking: Array.isArray(depsObj.blocking)
      ? (depsObj.blocking as unknown[])
          .map((d) => (d && typeof d === 'object' && !Array.isArray(d) ? (d as { blocked_external_id?: string }) : null))
          .filter((d): d is { blocked_external_id: string } => Boolean(d && typeof d.blocked_external_id === 'string' && d.blocked_external_id))
          .map((d) => ({ blocked_external_id: d.blocked_external_id }))
      : [],
  }

  /* Extra passthrough: allow JSON imports to keep unknown keys available for debugging */
  const extra_json = pickMappedValue(input, 'extra_json', mapping)
  const extra = {
    ...(extraFromInput ?? {}),
    ...(parseJsonObject(extra_json) ?? {}),
  }

  return {
    external_id,
    parent_external_id,
    title,
    description,
    start_date,
    due_date,
    priority,
    status,
    category,
    time_estimate,
    recurrence_pattern,
    attachments,
    tags,
    checklists,
    dependencies,
    extra,
  }
}

/**
 * Parse tasks from a CSV file into canonical records.
 * Accepts a mapping to translate headers and tolerates extra columns/fields.
 */
export async function parseTasksCsvFile(
  file: File,
  mapping?: TaskImportMapping,
): Promise<{ records: CanonicalTaskRecord[]; errors: TaskImportParseError[]; totalRows: number }> {
  /* File load: parse CSV text with header row */
  const text = await file.text()
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  /* Header mapping: if user-provided mapping is present, alias input headers → canonical headers */
  const headerMap = mapping?.csv?.headers ?? {}
  const invertHeaderMap = new Map<string, string>()
  for (const [canonical, inputHeader] of Object.entries(headerMap)) {
    if (inputHeader) invertHeaderMap.set(inputHeader, canonical)
  }

  const errors: TaskImportParseError[] = []
  const data = (parsed.data ?? []) as Record<string, unknown>[]
  const records: CanonicalTaskRecord[] = []

  /* Row normalization: map incoming headers to canonical keys where mapping exists */
  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2 // header is line 1
    const raw = data[i] ?? {}

    /* Normalize keys: apply inputHeader → canonicalHeader mapping */
    const normalized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) {
      const canonicalKey = invertHeaderMap.get(k) ?? k
      normalized[canonicalKey] = v
    }

    /* Skip blanks: if no title and no external id, treat as empty row */
    const title = normalizeCell(normalized.title)
    const external = normalizeCell(normalized.external_id)
    if (!title && !external) continue

    const record = coerceCanonicalRecord(
      normalized,
      { externalIdFallback: `row_${rowNumber}`, parentExternalId: null },
      undefined,
      {},
    )

    /* Validation: title required */
    if (!record.title.trim()) {
      errors.push({ rowNumber, message: 'Missing required field: title' })
      continue
    }

    records.push(record)
  }

  /* Structural parse errors from PapaParse (e.g. unmatched quotes) */
  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      errors.push({
        rowNumber: typeof e.row === 'number' ? e.row + 1 : undefined,
        message: e.message,
      })
    }
  }

  return { records, errors, totalRows: data.length }
}

/**
 * Parse tasks from a JSON file into canonical records.
 * Supports the canonical export shape `{ tasks: [...] }` or an array of objects (with mapping).
 */
export async function parseTasksJsonFile(
  file: File,
  mapping?: TaskImportMapping,
): Promise<{ records: CanonicalTaskRecord[]; errors: TaskImportParseError[] }> {
  /* Read + parse JSON payload */
  const text = await file.text()
  let payload: unknown
  try {
    payload = JSON.parse(text) as unknown
  } catch {
    return { records: [], errors: [{ message: 'Invalid JSON file.' }] }
  }

  /* Determine items array: canonical payload or mapped array path */
  const items =
    Array.isArray(payload)
      ? payload
      : getJsonItemsAtPath(payload, mapping?.json?.itemsPath ?? 'tasks')

  const records: CanonicalTaskRecord[] = []
  const errors: TaskImportParseError[] = []
  const fieldMap = mapping?.json?.fields ?? {}

  /* Flatten: accept nested `subtasks` arrays by walking depth-first */
  const walk = (item: unknown, parentExternalId: string | null, indexPath: string) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ message: `Invalid task object at ${indexPath}` })
      return
    }
    const obj = item as Record<string, unknown>

    const record = coerceCanonicalRecord(
      obj,
      { externalIdFallback: `json_${indexPath}`, parentExternalId },
      fieldMap,
      /* Extra: keep unknown keys except known canonical keys */
      obj,
    )

    if (!record.title.trim()) {
      errors.push({ message: `Missing required field: title at ${indexPath}` })
      return
    }

    records.push(record)

    const subtasksValue = pickMappedValue(obj, 'subtasks', fieldMap)
    const subtasks = Array.isArray(subtasksValue) ? (subtasksValue as unknown[]) : []
    subtasks.forEach((st, i) => walk(st, record.external_id, `${indexPath}.subtasks[${i}]`))
  }

  items.forEach((it, i) => walk(it, null, `tasks[${i}]`))
  return { records, errors }
}

/**
 * Export canonical records to CSV text.
 * Uses stable header order and JSON-in-cells for nested structures.
 */
export function exportTasksToCsv(records: CanonicalTaskRecord[]): string {
  /* Flatten: map canonical record to CSV row shape */
  const rows = records.map((r) => ({
    external_id: r.external_id,
    parent_external_id: r.parent_external_id ?? '',
    title: r.title,
    description: r.description ?? '',
    start_date: r.start_date ?? '',
    due_date: r.due_date ?? '',
    priority: r.priority,
    status: r.status,
    category: r.category ?? '',
    time_estimate: r.time_estimate ?? '',
    recurrence_pattern: r.recurrence_pattern ?? '',
    attachments_json: JSON.stringify(r.attachments ?? []),
    tags_csv: (r.tags ?? []).map((t) => t.name).filter(Boolean).join(','),
    checklists_json: JSON.stringify(r.checklists ?? []),
    dependencies_json: JSON.stringify(r.dependencies ?? { blocked_by: [], blocking: [] }),
    extra_json: JSON.stringify(r.extra ?? {}),
  }))

  /* Serialize: Papa will quote/escape as needed */
  return Papa.unparse(rows, { columns: [...TASKS_CSV_HEADERS] })
}

/* Download helper: trigger a browser download for a string payload */
export function downloadTextFile(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* Download helper: export canonical records to CSV and download */
export function downloadTasksCsv(filename: string, records: CanonicalTaskRecord[]): void {
  const csvText = exportTasksToCsv(records)
  downloadTextFile(filename, 'text/csv;charset=utf-8', csvText)
}

/* Download helper: export JSON payload and download */
export function downloadTasksJson(filename: string, payload: unknown): void {
  const jsonText = JSON.stringify(payload, null, 2)
  downloadTextFile(filename, 'application/json;charset=utf-8', jsonText)
}

