/* Note CSV utils: Parse and export main note documents (primary page only) */
import Papa from 'papaparse'

export const NOTES_CSV_HEADERS = [
  'id',
  'title',
  'page_title',
  'content',
  'cover_image_url',
  'created_at',
  'updated_at',
] as const

export interface ParsedNoteCsvRow {
  id: string | null
  title: string
  page_title: string
  content: string
  cover_image_url: string | null
  created_at: string | null
  updated_at: string | null
}

export interface NoteCsvParseError {
  rowNumber: number
  message: string
}

export interface NoteExportRow {
  id: string
  title: string
  page_title: string
  content: string
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

export async function parseNotesCsvFile(file: File): Promise<{
  rows: ParsedNoteCsvRow[]
  errors: NoteCsvParseError[]
  totalRows: number
}> {
  const text = await file.text()
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  const errors: NoteCsvParseError[] = []
  const fields = (parsed.meta.fields ?? []) as string[]
  const required = ['title', 'page_title', 'content']
  const missing = required.filter((h) => !fields.includes(h))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: `Missing required headers: ${missing.join(', ')}` }],
      totalRows: 0,
    }
  }

  const rows: ParsedNoteCsvRow[] = []
  const data = (parsed.data ?? []) as Record<string, unknown>[]

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2
    const record = data[i] ?? {}
    const title = normalizeCell(record.title)
    if (!title) {
      errors.push({ rowNumber, message: 'Missing required field: title' })
      continue
    }

    rows.push({
      id: normalizeCell(record.id) || null,
      title,
      page_title: normalizeCell(record.page_title) || 'Untitled',
      content: normalizeCell(record.content),
      cover_image_url: normalizeCell(record.cover_image_url) || null,
      created_at: normalizeCell(record.created_at) || null,
      updated_at: normalizeCell(record.updated_at) || null,
    })
  }

  return { rows, errors, totalRows: data.length }
}

export function exportNotesToCsv(rows: NoteExportRow[]): string {
  const csvRows = rows.map((r) => ({
    id: r.id,
    title: r.title,
    page_title: r.page_title,
    content: r.content,
    cover_image_url: r.cover_image_url ?? '',
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
  return Papa.unparse(csvRows, { columns: [...NOTES_CSV_HEADERS] })
}

export function downloadNotesCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
