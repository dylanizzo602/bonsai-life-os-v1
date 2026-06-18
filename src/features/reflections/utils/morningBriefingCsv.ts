/* Morning briefing CSV utils: Parse imports and generate exports for reflection entries (stored as journal type) */

import Papa from 'papaparse'
import type { MorningBriefingResponses, ReflectionEntry, JournalResponses } from '../types'

/* CSV schema: accepted columns for reflection import/export */
export const MORNING_BRIEFING_CSV_HEADERS = [
  'created_at',
  'title',
  'memorableMoment',
  'gratefulFor',
  'didEverything',
  'whatWouldMakeEasier',
  'responses_json',
] as const

export type MorningBriefingCsvHeader = (typeof MORNING_BRIEFING_CSV_HEADERS)[number]

export interface ParsedMorningBriefingCsvRow {
  created_at: string | null
  title: string | null
  /** Journal body HTML assembled from CSV columns */
  responses: JournalResponses
}

export interface MorningBriefingCsvParseError {
  rowNumber: number
  message: string
}

/** Morning briefing question labels used when converting CSV Q&A columns to journal HTML */
const BRIEFING_QUESTION_LABELS: Record<keyof MorningBriefingResponses, string> = {
  memorableMoment: 'What is one memorable moment from yesterday?',
  gratefulFor: 'What is something you are grateful for?',
  didEverything: 'Did you do everything you were supposed to yesterday? If not, why?',
  whatWouldMakeEasier: 'What would make today easier?',
}

/* Escape HTML for plain-text answers when building journal body */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/* Convert a single answer to HTML (preserve TipTap HTML or escape plain text) */
function answerToHtml(value: string): string {
  if (!value.trim()) return ''
  const looksLikeHtml = /<\s*(p|ul|ol|li|strong|em|h1|h2|br|div)[\s>]/i.test(value)
  if (looksLikeHtml) return value
  return escapeHtml(value).replace(/\n/g, '<br />')
}

/**
 * Convert morning-briefing-style CSV responses into a journal body (TipTap HTML).
 */
export function convertBriefingResponsesToJournalBody(
  responses: MorningBriefingResponses | Record<string, unknown>,
): string {
  /* Already a journal body: use as-is */
  const existingBody = (responses as JournalResponses).body
  if (typeof existingBody === 'string' && existingBody.trim()) {
    return existingBody
  }

  const r = responses as MorningBriefingResponses
  const sections: string[] = []

  for (const key of Object.keys(BRIEFING_QUESTION_LABELS) as (keyof MorningBriefingResponses)[]) {
    const answer = r[key]
    if (!answer?.trim()) continue
    const label = BRIEFING_QUESTION_LABELS[key]
    sections.push(
      `<p><strong>${escapeHtml(label)}</strong></p>${answerToHtml(answer)}`,
    )
  }

  return sections.join('') || '<p></p>'
}

/* Date formatting: create "Reflection – MMM d, yyyy" label for imported rows */
export function formatImportedReflectionTitle(createdAtIso: string): string {
  const d = new Date(createdAtIso)
  const dateLabel = Number.isNaN(d.getTime())
    ? 'Unknown date'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `Reflection – ${dateLabel}`
}

/* Parse helper: ensure a value is a trimmed string or empty string */
function normalizeCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

/* Parse helper: create responses object by merging JSON + explicit columns (explicit wins) */
function buildResponsesFromCsvRow(input: Record<string, unknown>): Record<string, unknown> {
  /* Base: start from responses_json if present and valid */
  const rawJson = normalizeCell(input.responses_json)
  let base: Record<string, unknown> = {}
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        base = parsed as Record<string, unknown>
      }
    } catch {
      // Ignore JSON parse errors here; caller will handle as a validation error when needed
    }
  }

  /* Explicit columns: override any matching keys from the JSON payload */
  const overrides: Record<string, unknown> = {}
  for (const key of ['memorableMoment', 'gratefulFor', 'didEverything', 'whatWouldMakeEasier'] as const) {
    const v = normalizeCell(input[key])
    if (v) overrides[key] = v
  }

  return { ...base, ...overrides }
}

/**
 * Parse a morning briefing CSV file into rows ready for insert.
 * Returns both valid rows and row-level errors so the UI can show a summary.
 */
export async function parseMorningBriefingCsvFile(file: File): Promise<{
  rows: ParsedMorningBriefingCsvRow[]
  errors: MorningBriefingCsvParseError[]
  totalRows: number
}> {
  /* Read file content: use File.text() for modern browser parsing */
  const text = await file.text()

  /* Parse CSV with headers so values map by column name */
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  /* Header validation: ensure required columns exist (title is accepted but ignored on import) */
  const errors: MorningBriefingCsvParseError[] = []
  const fields = (parsed.meta.fields ?? []) as string[]
  const missingHeaders = MORNING_BRIEFING_CSV_HEADERS.filter((h) => !fields.includes(h))
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: `Missing required headers: ${missingHeaders.join(', ')}` }],
      totalRows: 0,
    }
  }

  /* Row parsing: validate created_at and build responses */
  const rows: ParsedMorningBriefingCsvRow[] = []
  const data = (parsed.data ?? []) as Record<string, unknown>[]
  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2 // header is line 1
    const record = data[i] ?? {}

    /* Skip blank rows: no created_at, no responses, no json */
    const createdAtRaw = normalizeCell(record.created_at)
    const hasAnyResponse =
      normalizeCell(record.memorableMoment) ||
      normalizeCell(record.gratefulFor) ||
      normalizeCell(record.didEverything) ||
      normalizeCell(record.whatWouldMakeEasier) ||
      normalizeCell(record.responses_json)
    if (!createdAtRaw && !hasAnyResponse) continue

    /* created_at: required in practice for preserved timestamps; if missing, default to now */
    const createdAt = createdAtRaw || new Date().toISOString()
    const createdAtDate = new Date(createdAt)
    if (Number.isNaN(createdAtDate.getTime())) {
      errors.push({ rowNumber, message: `Invalid created_at: "${createdAtRaw}"` })
      continue
    }

    /* responses_json: if provided, require it to be valid JSON object */
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

    const briefingResponses = buildResponsesFromCsvRow(record)

    /* Import title: always override to "Reflection – <date>" using created_at date */
    const title = formatImportedReflectionTitle(createdAt)
    const body = convertBriefingResponsesToJournalBody(briefingResponses)
    rows.push({ created_at: createdAt, title, responses: { body } })
  }

  /* Structural parse errors from PapaParse (e.g. unmatched quotes) */
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
 * Export journal reflection entries to CSV with a stable header order.
 * Includes explicit Q&A columns when present (legacy imports) and `responses_json` for forward compatibility.
 */
export function exportMorningBriefingEntriesToCsv(entries: ReflectionEntry[]): string {
  /* Flatten: map DB shape to CSV row shape */
  const rows = entries.map((entry) => {
    const responses = (entry.responses ?? {}) as MorningBriefingResponses &
      JournalResponses &
      Record<string, unknown>

    /* Journal entries: body lives in responses_json; Q&A columns filled when legacy fields exist */
    const r = responses as MorningBriefingResponses

    return {
      created_at: entry.created_at,
      title: entry.title ?? '',
      memorableMoment: r.memorableMoment ?? '',
      gratefulFor: r.gratefulFor ?? '',
      didEverything: r.didEverything ?? '',
      whatWouldMakeEasier: r.whatWouldMakeEasier ?? '',
      responses_json: JSON.stringify(entry.responses ?? {}),
    }
  })

  /* Serialize: Papa will quote/escape as needed */
  return Papa.unparse(rows, { columns: [...MORNING_BRIEFING_CSV_HEADERS] })
}

/* Download helper: trigger a browser download for a CSV string */
export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

