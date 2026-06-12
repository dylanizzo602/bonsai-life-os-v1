/* smartQuickAdd: Parse Todoist-style tokens from a new-task title (dates, recurrence, tags, priority) */
import * as chrono from 'chrono-node'
import { serializeRecurrencePattern } from '../../../lib/recurrence'
import type { RecurrencePattern } from '../../../lib/recurrence'
import type { TaskPriority } from '../types'

export type SmartQuickAddMatchKind = 'date' | 'recurrence' | 'tag' | 'priority' | 'holiday' | 'estimate'

export interface SmartQuickAddMatch {
  start: number
  end: number
  kind: SmartQuickAddMatchKind
}

export interface SmartQuickAddResult {
  /** Title with parsed tokens removed (used on create so saved title matches Todoist) */
  cleanedTitle: string
  /** Extracted tag names (without @), in order of appearance */
  tagNames: string[]
  /** Parsed priority from p1/p2/p3, mapped to app TaskPriority */
  priority: TaskPriority | null
  /** Parsed due date: date-only (YYYY-MM-DD) or full ISO (with explicit time) */
  due_date: string | null
  /** Parsed time estimate in minutes (e.g. "30m", "1h", "1hr 15m") */
  time_estimate: number | null
  /** Recurrence pattern JSON string to store in tasks.recurrence_pattern */
  recurrence_pattern: string | null
  /** Highlight ranges for recognized tokens in the raw input */
  matches: SmartQuickAddMatch[]
}

const HOLIDAY_KEYWORDS: Array<{ pattern: RegExp; month: number; day: number }> = [
  { pattern: /\bnew\s+year\s+day\b/i, month: 1, day: 1 },
  { pattern: /\bvalentine(?:'s)?\s+day\b/i, month: 2, day: 14 },
  { pattern: /\bvalentine\b/i, month: 2, day: 14 },
  { pattern: /\bhalloween\b/i, month: 10, day: 31 },
  { pattern: /\bnew\s+year\s+eve\b/i, month: 12, day: 31 },
]

const WEEKDAY_TO_CODE: Record<string, string> = {
  sunday: 'SU',
  sun: 'SU',
  monday: 'MO',
  mon: 'MO',
  tuesday: 'TU',
  tue: 'TU',
  tues: 'TU',
  wednesday: 'WE',
  wed: 'WE',
  thursday: 'TH',
  thu: 'TH',
  thur: 'TH',
  thurs: 'TH',
  friday: 'FR',
  fri: 'FR',
  saturday: 'SA',
  sat: 'SA',
}

function toYMDLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hasExplicitTime(parsed: chrono.ParsedResult): boolean {
  const start = parsed.start
  return Boolean(start.isCertain('hour') || start.isCertain('minute') || start.isCertain('second'))
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function removeRanges(raw: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) return normalizeWhitespace(raw)
  const chars = raw.split('')
  for (const r of ranges) {
    for (let i = Math.max(0, r.start); i < Math.min(chars.length, r.end); i++) {
      chars[i] = ' '
    }
  }
  return normalizeWhitespace(chars.join(''))
}

function uniqInOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

function mapPriorityToken(token: string): TaskPriority | null {
  const t = token.toLowerCase()
  if (t === 'p1') return 'urgent'
  if (t === 'p2') return 'high'
  if (t === 'p3') return 'medium'
  return null
}

function parseTimeEstimateMinutes(raw: string): {
  minutes: number | null
  ranges: Array<{ start: number; end: number }>
} {
  /* Estimate parsing: support "15m", "15min", "2h", "2hr", and combined "1h 30m" (sum). */
  const lower = raw.toLowerCase()
  let totalMinutes = 0
  const ranges: Array<{ start: number; end: number }> = []

  /* Hours: number immediately followed by h/hr (or hour/hours) */
  for (const m of lower.matchAll(/\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/g)) {
    if (m.index == null) continue
    const n = parseFloat(m[1] ?? '0')
    if (!Number.isFinite(n) || n <= 0) continue
    totalMinutes += Math.round(n * 60)
    ranges.push({ start: m.index, end: m.index + (m[0] ?? '').length })
  }

  /* Minutes: number immediately followed by m/min (or minute/minutes) */
  for (const m of lower.matchAll(/\b(\d+)\s*(m|min|mins|minute|minutes)\b/g)) {
    if (m.index == null) continue
    const n = parseInt(m[1] ?? '0', 10)
    if (!Number.isFinite(n) || n <= 0) continue
    totalMinutes += n
    ranges.push({ start: m.index, end: m.index + (m[0] ?? '').length })
  }

  return {
    minutes: totalMinutes > 0 ? totalMinutes : null,
    ranges,
  }
}

function buildHolidayDate(now: Date, month: number, day: number): Date {
  const y = now.getFullYear()
  const candidate = new Date(y, month - 1, day, 9, 0, 0, 0)
  /* Holiday mapping: if the day already passed this year, use next year */
  if (candidate.getTime() < now.getTime()) {
    return new Date(y + 1, month - 1, day, 9, 0, 0, 0)
  }
  return candidate
}

function computeSecondWeekdayFromNow(now: Date, weekdayCode: string): Date {
  /* Weekday math: Date.getDay() is 0=Sun..6=Sat; our codes are SU..SA */
  const codeToDow: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
  const targetDow = codeToDow[weekdayCode] ?? 5
  const todayDow = now.getDay()
  const daysUntilNext = (targetDow - todayDow + 7) % 7
  const next = new Date(now)
  next.setHours(12, 0, 0, 0)
  next.setDate(next.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext))
  const second = new Date(next)
  second.setDate(second.getDate() + 7)
  return second
}

/** Parse a human-entered duration like "3 weeks" to number + unit */
function parseForDuration(s: string): { n: number; unit: 'day' | 'week' | 'month' | 'year' } | null {
  const m = s.match(/\bfor\s+(\d{1,3})\s*(day|days|week|weeks|month|months|year|years)\b/i)
  if (!m) return null
  const n = parseInt(m[1] ?? '0', 10)
  if (!Number.isFinite(n) || n <= 0) return null
  const u = (m[2] ?? '').toLowerCase()
  if (u.startsWith('day')) return { n, unit: 'day' }
  if (u.startsWith('week')) return { n, unit: 'week' }
  if (u.startsWith('month')) return { n, unit: 'month' }
  if (u.startsWith('year')) return { n, unit: 'year' }
  return null
}

function addDaysLocal(ymd: string, days: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toYMDLocal(d)
}

function normalizeDismissedSpans(dismissedSpans?: string[]): Set<string> {
  return new Set((dismissedSpans ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean))
}

/** True when the user dismissed this exact highlighted substring via backspace/delete. */
function isDismissedSpan(
  raw: string,
  start: number,
  end: number,
  dismissed: Set<string>,
): boolean {
  if (dismissed.size === 0 || end <= start) return false
  return dismissed.has(raw.slice(start, end).toLowerCase())
}

/** Backspace: dismiss when deleting a character inside a highlighted smart token. */
export function findMatchAffectedByBackspace(
  matches: SmartQuickAddMatch[],
  cursor: number,
  selectionEnd: number,
): SmartQuickAddMatch | null {
  if (cursor !== selectionEnd) {
    return findMatchOverlappingRange(matches, cursor, selectionEnd)
  }
  const deleteIndex = cursor - 1
  if (deleteIndex < 0) return null
  return matches.find((m) => deleteIndex >= m.start && deleteIndex < m.end) ?? null
}

/** Delete: dismiss when removing a character inside a highlighted smart token. */
export function findMatchAffectedByDelete(
  matches: SmartQuickAddMatch[],
  cursor: number,
  selectionEnd: number,
): SmartQuickAddMatch | null {
  if (cursor !== selectionEnd) {
    return findMatchOverlappingRange(matches, cursor, selectionEnd)
  }
  return matches.find((m) => cursor >= m.start && cursor < m.end) ?? null
}

function findMatchOverlappingRange(
  matches: SmartQuickAddMatch[],
  start: number,
  end: number,
): SmartQuickAddMatch | null {
  return matches.find((m) => m.start < end && m.end > start) ?? null
}

/** Lowercase dismissed span text for a highlighted match in the current title. */
export function getDismissedSpanText(raw: string, match: SmartQuickAddMatch): string {
  return raw.slice(match.start, match.end).toLowerCase().trim()
}

/** Re-sync one smart-derived form field after the user dismisses a highlighted token. */
export function reapplySmartFieldForKind(
  kind: SmartQuickAddMatchKind,
  parsed: SmartQuickAddResult,
  apply: {
    setPriority: (value: TaskPriority) => void
    setDueDate: (value: string | null) => void
    setTimeEstimate: (value: number | null) => void
    setRecurrencePattern: (value: string | null) => void
  },
): void {
  switch (kind) {
    case 'date':
    case 'holiday':
      apply.setDueDate(parsed.due_date)
      break
    case 'recurrence':
      apply.setRecurrencePattern(parsed.recurrence_pattern)
      apply.setDueDate(parsed.due_date)
      break
    case 'priority':
      apply.setPriority(parsed.priority ?? 'medium')
      break
    case 'estimate':
      apply.setTimeEstimate(parsed.time_estimate)
      break
    case 'tag':
      break
    default:
      break
  }
}

/** Smart Quick Add parser. NOTE: This is intended for new task creation only (not edits). */
export function parseSmartQuickAdd(
  input: string,
  opts: { now?: Date; dismissedSpans?: string[] } = {},
): SmartQuickAddResult {
  /* Inputs: raw string and reference clock */
  const now = opts.now ?? new Date()
  const raw = input ?? ''
  const dismissed = normalizeDismissedSpans(opts.dismissedSpans)
  const matches: SmartQuickAddMatch[] = []
  const rangesToRemove: Array<{ start: number; end: number }> = []

  const addMatch = (start: number, end: number, kind: SmartQuickAddMatchKind): boolean => {
    if (isDismissedSpan(raw, start, end, dismissed)) return false
    matches.push({ start, end, kind })
    rangesToRemove.push({ start, end })
    return true
  }

  /* Time estimate: capture tokens like "15m"/"15min" and "2h"/"2hr" and mark them for highlighting/removal */
  const estimateParsed = parseTimeEstimateMinutes(raw)
  let time_estimate: number | null = null
  let estimateMinutes = 0
  for (const r of estimateParsed.ranges) {
    if (!addMatch(r.start, r.end, 'estimate')) continue
    const token = raw.slice(r.start, r.end).toLowerCase()
    const hourMatch = token.match(/\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/)
    if (hourMatch) {
      const n = parseFloat(hourMatch[1] ?? '0')
      if (Number.isFinite(n) && n > 0) estimateMinutes += Math.round(n * 60)
      continue
    }
    const minuteMatch = token.match(/\b(\d+)\s*(m|min|mins|minute|minutes)\b/)
    if (minuteMatch) {
      const n = parseInt(minuteMatch[1] ?? '0', 10)
      if (Number.isFinite(n) && n > 0) estimateMinutes += n
    }
  }
  time_estimate = estimateMinutes > 0 ? estimateMinutes : null

  /* Tags: capture @tag tokens and mark them for highlighting/removal */
  const tagNames: string[] = []
  for (const m of raw.matchAll(/(^|\s)@([\w-]+)/g)) {
    const prefixLen = (m[1] ?? '').length
    const name = m[2] ?? ''
    const start = (m.index ?? 0) + prefixLen
    const end = start + 1 + name.length
    if (!addMatch(start, end, 'tag')) continue
    tagNames.push(name)
  }

  /* Priority: recognize p1/p2/p3 and map to app priorities */
  let priority: TaskPriority | null = null
  for (const m of raw.matchAll(/\bp[123]\b/gi)) {
    const token = m[0] ?? ''
    const start = m.index ?? 0
    const end = start + token.length
    if (!addMatch(start, end, 'priority')) continue
    const mapped = mapPriorityToken(token)
    if (mapped) priority = mapped
  }

  /* Holidays: fixed keyword mapping to a concrete date */
  let dueDateFromHoliday: Date | null = null
  for (const h of HOLIDAY_KEYWORDS) {
    const m = raw.match(h.pattern)
    if (!m || m.index == null) continue
    const start = m.index
    const end = start + (m[0] ?? '').length
    if (!addMatch(start, end, 'holiday')) continue
    if (!dueDateFromHoliday) {
      dueDateFromHoliday = buildHolidayDate(now, h.month, h.day)
    }
    break
  }

  /* Recurrence: parse known phrases and produce a stored JSON pattern */
  let recurrencePattern: RecurrencePattern | null = null
  let recurrenceAnchor: 'due' | 'completion' | null = null
  let recurrenceAnchorDueYMD: string | null = null
  let recurrenceUntilYMD: string | null = null

  const lower = raw.toLowerCase()
  const everyBang = /\bevery!\b/.test(lower)
  const afterMatch = lower.match(/\bafter\s+(\d{1,3})\s*(day|days|week|weeks|month|months|year|years|hour|hours)\b/)
  if (everyBang) recurrenceAnchor = 'completion'
  if (afterMatch) recurrenceAnchor = 'completion'

  const everyOtherSimple = lower.match(/\bevery\s+other\s+(day|week|month|year)\b/)
  const everyOtherWeekday = lower.match(/\bevery\s+other\s+([a-z]{3,9})\b/)
  const everyInterval = lower.match(/\bevery\s+(\d{1,3})\s*(day|days|week|weeks|month|months|year|years|hour|hours)\b/)
  const everyQuarter = lower.match(/\bevery\s+quarter\b|\bquarterly\b/)
  const weekdaysListMatch = lower.match(/\b(?:every|ev)\s+([a-z]{3,9})(?:\s*,\s*([a-z]{3,9}))(?:\s*,\s*([a-z]{3,9}))?(?:\s*,\s*([a-z]{3,9}))?\b/)

  /* Start/end boundaries for recurrence (from/starting/until/ending/for) */
  const startPhrase = lower.match(/\b(?:starting\s+on|from)\s+([^,]+?)(?=(?:\s+until|\s+ending|\s+end(?:ing)?\b|$))/i)
  const untilPhrase = lower.match(/\b(?:until|ending)\s+([^,]+?)(?=$)/i)
  const duration = parseForDuration(lower)

  const markRecurrenceRange = (re: RegExp): boolean => {
    const m = raw.match(re)
    if (!m || m.index == null) return false
    const start = m.index
    const end = start + (m[0] ?? '').length
    return addMatch(start, end, 'recurrence')
  }

  if (everyBang && markRecurrenceRange(/\bevery!\b/i)) recurrenceAnchor = 'completion'
  if (
    afterMatch &&
    markRecurrenceRange(/\bafter\s+\d{1,3}\s*(?:day|days|week|weeks|month|months|year|years|hour|hours)\b/i)
  ) {
    recurrenceAnchor = 'completion'
  }

  if (everyQuarter) {
    if (markRecurrenceRange(/\bevery\s+quarter\b|\bquarterly\b/i)) {
      recurrencePattern = { freq: 'month', interval: 3, until: null }
    }
  } else if (everyOtherSimple) {
    if (markRecurrenceRange(/\bevery\s+other\s+(day|week|month|year)\b/i)) {
      const unit = everyOtherSimple[1]
      recurrencePattern = { freq: unit as RecurrencePattern['freq'], interval: 2, until: null }
    }
  } else if (everyOtherWeekday && WEEKDAY_TO_CODE[everyOtherWeekday[1]] != null) {
    if (markRecurrenceRange(/\bevery\s+other\s+[a-z]{3,9}\b/i)) {
      const code = WEEKDAY_TO_CODE[everyOtherWeekday[1]]
      recurrencePattern = { freq: 'week', interval: 2, byDay: [code], until: null }
      recurrenceAnchorDueYMD = toYMDLocal(computeSecondWeekdayFromNow(now, code))
    }
  } else if (weekdaysListMatch) {
    const rawDays = weekdaysListMatch.slice(1).filter(Boolean) as string[]
    const codes = rawDays.map((d) => WEEKDAY_TO_CODE[d]).filter(Boolean)
    if (
      codes.length > 0 &&
      markRecurrenceRange(/\b(?:every|ev)\s+[a-z]{3,9}(?:\s*,\s*[a-z]{3,9}){1,3}\b/i)
    ) {
      recurrencePattern = { freq: 'week', interval: 1, byDay: uniqInOrder(codes), until: null }
    }
  } else if (everyInterval) {
    const n = Math.max(1, parseInt(everyInterval[1] ?? '1', 10))
    const unitRaw = (everyInterval[2] ?? '').toLowerCase()
    if (unitRaw.startsWith('hour')) {
      /* Hourly recurrence is supported by Todoist but not by our recurrence engine (day/week/month/year only). Soft fail. */
    } else if (
      markRecurrenceRange(/\bevery\s+\d{1,3}\s*(?:day|days|week|weeks|month|months|year|years|hour|hours)\b/i)
    ) {
      const freq = unitRaw.startsWith('day')
        ? 'day'
        : unitRaw.startsWith('week')
          ? 'week'
          : unitRaw.startsWith('month')
            ? 'month'
            : 'year'
      recurrencePattern = { freq, interval: n, until: null }
    }
  } else if (/\beveryday\b/.test(lower) || /\bdaily\b/.test(lower)) {
    if (markRecurrenceRange(/\b(?:everyday|daily)\b/i)) {
      recurrencePattern = { freq: 'day', interval: 1, until: null }
    }
  }

  /* Parse recurrence start anchor date from "starting on/from ..." */
  if (recurrencePattern && startPhrase?.[1]) {
    const text = startPhrase[1].trim()
    const parsed = chrono.parse(text, now, { forwardDate: true })[0]
    if (parsed?.start?.date()) {
      recurrenceAnchorDueYMD = toYMDLocal(parsed.start.date())
      const idx = lower.indexOf(startPhrase[0])
      if (idx >= 0) {
        addMatch(idx, idx + startPhrase[0].length, 'recurrence')
      }
    }
  }

  /* Parse recurrence until/end date from "until/ending ..." */
  if (recurrencePattern && untilPhrase?.[1]) {
    const text = untilPhrase[1].trim()
    const parsed = chrono.parse(text, now, { forwardDate: true })[0]
    if (parsed?.start?.date()) {
      recurrenceUntilYMD = toYMDLocal(parsed.start.date())
      const idx = lower.indexOf(untilPhrase[0])
      if (idx >= 0) {
        addMatch(idx, idx + untilPhrase[0].length, 'recurrence')
      }
    }
  }

  /* Parse recurrence end from "for N weeks/months/..." (inclusive until) */
  if (recurrencePattern && duration) {
    const idx = lower.match(/\bfor\s+\d{1,3}\s*(day|days|week|weeks|month|months|year|years)\b/i)?.index
    if (idx != null) {
      const end = idx + (lower.slice(idx).match(/^\bfor\s+\d{1,3}\s*\w+\b/i)?.[0]?.length ?? 0)
      addMatch(idx, end, 'recurrence')
    }
    const anchor = recurrenceAnchorDueYMD ?? toYMDLocal(now)
    if (duration.unit === 'day') recurrenceUntilYMD = addDaysLocal(anchor, duration.n - 1)
    if (duration.unit === 'week') recurrenceUntilYMD = addDaysLocal(anchor, duration.n * 7 - 1)
    /* Month/year inclusive end for v1: soft approximation via Date month/year add */
    if (duration.unit === 'month') {
      const d = new Date(anchor + 'T12:00:00')
      d.setMonth(d.getMonth() + duration.n)
      d.setDate(d.getDate() - 1)
      recurrenceUntilYMD = toYMDLocal(d)
    }
    if (duration.unit === 'year') {
      const d = new Date(anchor + 'T12:00:00')
      d.setFullYear(d.getFullYear() + duration.n)
      d.setDate(d.getDate() - 1)
      recurrenceUntilYMD = toYMDLocal(d)
    }
  }

  if (recurrencePattern) {
    /* Weekly dynamic default: anchor on completion unless explicitly using every! override is absent? */
    if (!recurrenceAnchor) {
      recurrenceAnchor = recurrencePattern.freq === 'week' ? 'completion' : 'due'
    }
    ;(recurrencePattern as RecurrencePattern & { anchor?: 'due' | 'completion' }).anchor = recurrenceAnchor
    recurrencePattern.until = recurrenceUntilYMD ?? null
  }

  /* Due date: prefer explicit chrono parse; fall back to holiday date; else use recurrence anchor if set */
  let due_date: string | null = null
  const chronoResults = chrono.parse(raw, now, { forwardDate: true })
  if (chronoResults.length > 0) {
    const best = chronoResults[0]
    if (best.index != null && best.text) {
      const start = best.index
      const end = best.index + best.text.length
      if (addMatch(start, end, 'date')) {
        const d = best.start?.date()
        if (d) {
          due_date = hasExplicitTime(best) ? d.toISOString() : toYMDLocal(d)
        }
      }
    }
  } else if (dueDateFromHoliday) {
    due_date = toYMDLocal(dueDateFromHoliday)
  }

  if (recurrencePattern) {
    /* When recurrence is detected and no explicit due date was typed, use computed anchor. */
    if (!due_date) {
      due_date = recurrenceAnchorDueYMD ?? toYMDLocal(now)
    }
  }

  const recurrence_pattern = recurrencePattern ? serializeRecurrencePattern(recurrencePattern) : null

  /* Output: ensure highlight ranges are sorted and non-overlapping (best-effort) */
  const sortedMatches = [...matches]
    .filter((m) => m.end > m.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const compactMatches: SmartQuickAddMatch[] = []
  let lastEnd = -1
  for (const m of sortedMatches) {
    if (m.start < lastEnd) continue
    compactMatches.push(m)
    lastEnd = m.end
  }

  const cleanedTitle = removeRanges(raw, rangesToRemove)

  return {
    cleanedTitle,
    tagNames: uniqInOrder(tagNames),
    priority,
    due_date,
    time_estimate,
    recurrence_pattern,
    matches: compactMatches,
  }
}

