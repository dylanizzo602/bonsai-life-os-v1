/* Reflection CSV utils: Parse and export all reflection entry types */
import Papa from 'papaparse'
import type {
  GoalReflectionResponses,
  JournalResponses,
  MorningBriefingResponses,
  ReflectionEntry,
  ReflectionEntryType,
} from '../types'

export const REFLECTION_CSV_HEADERS = [
  'id',
  'type',
  'created_at',
  'title',
  'memorableMoment',
  'gratefulFor',
  'habitsGotInTheWay',
  'habitsDoDifferentlyToday',
  'didEverything',
  'whatWouldMakeEasier',
  'weekHighlights',
  'weekImprove',
  'whatContributedToSuccess',
  'goalId',
  'body',
  'responses_json',
] as const

export type ReflectionCsvHeader = (typeof REFLECTION_CSV_HEADERS)[number]

export interface ParsedReflectionCsvRow {
  id: string | null
  type: ReflectionEntryType
  created_at: string
  title: string | null
  responses: Record<string, unknown>
}

export interface ReflectionCsvParseError {
  rowNumber: number
  message: string
}

const VALID_TYPES: ReflectionEntryType[] = [
  'journal',
  'morning_briefing',
  'weekly_briefing',
  'goal',
]

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

/** Build responses object from CSV row columns + responses_json */
function buildResponsesFromCsvRow(input: Record<string, unknown>): Record<string, unknown> {
  const rawJson = normalizeCell(input.responses_json)
  let base: Record<string, unknown> = {}
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        base = parsed as Record<string, unknown>
      }
    } catch {
      /* handled by caller */
    }
  }

  const overrides: Record<string, unknown> = {}
  const keys = [
    'memorableMoment',
    'gratefulFor',
    'habitsGotInTheWay',
    'habitsDoDifferentlyToday',
    'didEverything',
    'whatWouldMakeEasier',
    'weekHighlights',
    'weekImprove',
    'whatContributedToSuccess',
    'goalId',
    'body',
  ] as const

  for (const key of keys) {
    const v = normalizeCell(input[key])
    if (v) overrides[key] = v
  }

  return { ...base, ...overrides }
}

function formatImportedReflectionTitle(createdAtIso: string): string {
  const d = new Date(createdAtIso)
  const dateLabel = Number.isNaN(d.getTime())
    ? 'Unknown date'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `Reflection – ${dateLabel}`
}

function formatImportedGoalReflectionTitle(createdAtIso: string): string {
  const d = new Date(createdAtIso)
  const dateLabel = Number.isNaN(d.getTime())
    ? 'Unknown date'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `Goal Reflection – ${dateLabel}`
}

function rowHasImportableContent(record: Record<string, unknown>): boolean {
  return (
    normalizeCell(record.title) !== '' ||
    normalizeCell(record.responses_json) !== '' ||
    normalizeCell(record.body) !== '' ||
    normalizeCell(record.memorableMoment) !== '' ||
    normalizeCell(record.whatContributedToSuccess) !== '' ||
    normalizeCell(record.goalId) !== ''
  )
}

/**
 * Parse reflections CSV into rows ready for import.
 */
export async function parseReflectionCsvFile(file: File): Promise<{
  rows: ParsedReflectionCsvRow[]
  errors: ReflectionCsvParseError[]
  totalRows: number
}> {
  const text = await file.text()
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  const errors: ReflectionCsvParseError[] = []
  const fields = (parsed.meta.fields ?? []) as string[]
  const required = ['type', 'created_at']
  const missingHeaders = required.filter((h) => !fields.includes(h))
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: `Missing required headers: ${missingHeaders.join(', ')}` }],
      totalRows: 0,
    }
  }

  const rows: ParsedReflectionCsvRow[] = []
  const data = (parsed.data ?? []) as Record<string, unknown>[]

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2
    const record = data[i] ?? {}

    const typeRaw = normalizeCell(record.type) as ReflectionEntryType
    if (!VALID_TYPES.includes(typeRaw)) {
      errors.push({ rowNumber, message: `Invalid type: "${typeRaw}"` })
      continue
    }

    const createdAtRaw = normalizeCell(record.created_at)
    const hasContent = rowHasImportableContent(record)

    if (!createdAtRaw && !hasContent) continue

    const createdAt = createdAtRaw || new Date().toISOString()
    if (Number.isNaN(new Date(createdAt).getTime())) {
      errors.push({ rowNumber, message: `Invalid created_at: "${createdAtRaw}"` })
      continue
    }

    const rawJson = normalizeCell(record.responses_json)
    if (rawJson) {
      try {
        const parsedJson = JSON.parse(rawJson) as unknown
        if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
          errors.push({ rowNumber, message: 'responses_json must be a JSON object' })
          continue
        }
      } catch {
        errors.push({ rowNumber, message: 'responses_json must be valid JSON' })
        continue
      }
    }

    const responses = buildResponsesFromCsvRow(record)
    const titleRaw = normalizeCell(record.title)
    const title =
      titleRaw ||
      (typeRaw === 'journal' ? formatImportedReflectionTitle(createdAt) : null) ||
      (typeRaw === 'goal' ? formatImportedGoalReflectionTitle(createdAt) : null)

    const id = normalizeCell(record.id) || null

    rows.push({
      id,
      type: typeRaw,
      created_at: createdAt,
      title,
      responses,
    })
  }

  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      errors.push({
        rowNumber: typeof e.row === 'number' ? e.row + 1 : 0,
        message: e.message,
      })
    }
  }

  return { rows, errors, totalRows: data.length }
}

/**
 * Export reflection entries to CSV (all types).
 */
export function exportReflectionEntriesToCsv(entries: ReflectionEntry[]): string {
  const rows = entries.map((entry) => {
    const responses = (entry.responses ?? {}) as MorningBriefingResponses &
      JournalResponses &
      GoalReflectionResponses &
      Record<string, unknown>
    const morning = responses as MorningBriefingResponses
    const goal = responses as GoalReflectionResponses

    return {
      id: entry.id,
      type: entry.type,
      created_at: entry.created_at,
      title: entry.title ?? '',
      memorableMoment: morning.memorableMoment ?? '',
      gratefulFor: morning.gratefulFor ?? '',
      habitsGotInTheWay: morning.habitsGotInTheWay ?? '',
      habitsDoDifferentlyToday: morning.habitsDoDifferentlyToday ?? '',
      didEverything: morning.didEverything ?? '',
      whatWouldMakeEasier: morning.whatWouldMakeEasier ?? '',
      weekHighlights: morning.weekHighlights ?? '',
      weekImprove: morning.weekImprove ?? '',
      whatContributedToSuccess: goal.whatContributedToSuccess ?? '',
      goalId: goal.goalId ?? '',
      body: responses.body ?? '',
      responses_json: JSON.stringify(entry.responses ?? {}),
    }
  })

  return Papa.unparse(rows, { columns: [...REFLECTION_CSV_HEADERS] })
}

export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
