/* Script entrypoint: One-time data fix for recurring tasks that were completed without advancing recurrence. */
import { createClient } from '@supabase/supabase-js'

/* Lightweight copies of the recurrence helpers (kept in sync with src/lib/recurrence.ts). */
type RecurrenceFreq = 'day' | 'week' | 'month' | 'year'

interface RecurrencePattern {
  freq: RecurrenceFreq
  interval: number
  byDay?: string[] | string
  byMonthDay?: number
  bySetPos?: number
  byMonth?: number
  until?: string | null
  reopenChecklist?: boolean
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

function parseRecurrencePattern(str: string | null | undefined): RecurrencePattern | null {
  if (!str || typeof str !== 'string' || str.trim() === '') return null
  try {
    const parsed = JSON.parse(str) as RecurrencePattern
    if (!parsed.freq || !['day', 'week', 'month', 'year'].includes(parsed.freq)) return null
    return {
      ...parsed,
      interval: Math.max(1, parsed.interval ?? 1),
      until: parsed.until ?? null,
    }
  } catch {
    return null
  }
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYMD(ymd: string): { year: number; month: number; date: number } {
  const [y, m, d] = ymd.split('-').map(Number)
  return { year: y, month: (m ?? 1) - 1, date: d ?? 1 }
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function clampDayForMonth(year: number, month: number, day: number): number {
  const last = getLastDayOfMonth(year, month)
  if (day === -1 || day > last) return last
  return Math.max(1, Math.min(31, day))
}

function getNextOccurrence(pattern: RecurrencePattern | null, currentDueYMD: string): string | null {
  if (!pattern || !currentDueYMD) return null
  const { year, month, date } = parseYMD(currentDueYMD)
  const untilDate = pattern.until ? parseYMD(pattern.until) : null

  const addDays = (d: Date, n: number): Date => {
    const out = new Date(d)
    out.setDate(d.getDate() + n)
    return out
  }

  const addMonths = (d: Date, n: number): Date => {
    const out = new Date(d)
    out.setMonth(d.getMonth() + n)
    return out
  }

  const isBeforeOrEqual = (ymd: string, limit: { year: number; month: number; date: number }): boolean => {
    const p = parseYMD(ymd)
    if (p.year < limit.year) return true
    if (p.year > limit.year) return false
    if (p.month < limit.month) return true
    if (p.month > limit.month) return false
    return p.date <= limit.date
  }

  let next: Date | null = null

  if (pattern.freq === 'day') {
    next = addDays(new Date(year, month, date), pattern.interval)
  } else if (pattern.freq === 'week') {
    const days = Array.isArray(pattern.byDay) ? pattern.byDay : pattern.byDay ? [pattern.byDay] : []
    const current = new Date(year, month, date)
    const anchor = new Date(year, month, date)

    if (days.length === 0) {
      next = addDays(current, 7 * pattern.interval)
    } else {
      const validDows = days
        .map((d) => DAY_CODES.indexOf(d as (typeof DAY_CODES)[number]))
        .filter((i) => i >= 0)
      if (validDows.length === 0) {
        next = addDays(current, 7 * pattern.interval)
      } else {
        const isOnValidDay = validDows.includes(current.getDay())
        if (isOnValidDay) {
          next = addDays(current, 7 * pattern.interval)
        } else {
          const anchorMs = anchor.getTime()
          const msPerWeek = 7 * 24 * 60 * 60 * 1000
          let d = addDays(current, 1)
          for (let i = 0; i < 60; i++) {
            if (!validDows.includes(d.getDay())) {
              d = addDays(d, 1)
              continue
            }
            const weeksSince = Math.floor((d.getTime() - anchorMs) / msPerWeek)
            if (weeksSince % pattern.interval === 0) {
              next = d
              break
            }
            d = addDays(d, 1)
          }
          next = next ?? addDays(current, 7 * pattern.interval)
        }
      }
    }
  } else if (pattern.freq === 'month') {
    const intervalMonths = Math.max(1, pattern.interval ?? 1)
    if (pattern.bySetPos != null && pattern.bySetPos >= 1 && pattern.bySetPos <= 5) {
      const targetDay = Array.isArray(pattern.byDay) ? pattern.byDay[0] : pattern.byDay
      const targetDow = targetDay ? DAY_CODES.indexOf(targetDay as (typeof DAY_CODES)[number]) : 0
      const nextMonth = addMonths(new Date(year, month, 1), intervalMonths)
      const first = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
      const firstDow = first.getDay()
      let offset = (targetDow - firstDow + 7) % 7
      offset += (pattern.bySetPos - 1) * 7
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + offset)
      next = d
    } else {
      const targetDay = pattern.byMonthDay ?? date
      const nextMonthFirst = addMonths(new Date(year, month, 1), intervalMonths)
      const clamped = clampDayForMonth(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), targetDay === -1 ? 31 : targetDay)
      next = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), clamped)
    }
  } else if (pattern.freq === 'year') {
    const intervalYears = Math.max(1, pattern.interval ?? 1)
    const m = (pattern.byMonth ?? month + 1) - 1
    const day = pattern.byMonthDay ?? date
    const nextYear = year + intervalYears
    const clamped = clampDayForMonth(nextYear, m, day === -1 ? 31 : day)
    next = new Date(nextYear, m, clamped)
  } else {
    return null
  }

  if (!next) return null
  const nextYMD = toYMD(next)
  if (untilDate && !isBeforeOrEqual(nextYMD, untilDate)) return null
  return nextYMD
}

/* Types section: Minimal Task row shape needed for the data fix. */
interface TaskRow {
  id: string
  user_id: string | null
  title: string
  status: 'active' | 'in_progress' | 'completed' | 'archived' | 'deleted'
  due_date: string | null
  start_date: string | null
  recurrence_pattern: string | null
  completed_at: string | null
}

/* Helper section: Parse ISO/date-only strings into YYYY-MM-DD for recurrence helpers. */
function toDateOnly(iso: string | null): string | null {
  if (!iso) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* Helper section: Add days to a YYYY-MM-DD string (used to preserve start_date offset from due_date). */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/* Core logic section: Compute the corrected dates and status for a recurring task that was left completed. */
function computeFixedRecurringState(task: TaskRow): {
  status: TaskRow['status']
  due_date: string | null
  start_date: string | null
  completed_at: string | null
} | null {
  const pattern = parseRecurrencePattern(task.recurrence_pattern)
  if (!pattern) return null

  const dueYMD = toDateOnly(task.due_date)
  if (!dueYMD) return null

  const nextDueYMD = getNextOccurrence(pattern, dueYMD)
  if (!nextDueYMD) {
    /* No future occurrence (e.g. past pattern.until) – leave completed as-is. */
    return null
  }

  /* Preserve offset between start_date and due_date if start_date exists. */
  const startYMD = toDateOnly(task.start_date)
  let nextStartYMD: string | null = null
  if (startYMD) {
    const startDate = new Date(startYMD + 'T12:00:00')
    const dueDate = new Date(dueYMD + 'T12:00:00')
    const offsetDays = Math.round(
      (dueDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    )
    nextStartYMD = addDays(nextDueYMD, -offsetDays)
  }

  return {
    status: 'active',
    due_date: nextDueYMD,
    start_date: nextStartYMD,
    completed_at: null,
  }
}

/* Supabase client section: Create a service client using environment variables (never checked into version control). */
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run this script.')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

/* Script main section: Find affected tasks, compute fixes, and apply updates in small batches. */
export async function fixRecurringTasksOnce() {
  const supabase = getSupabaseClient()

  // Step 1: Load candidate tasks – recurring and currently marked completed.
  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, user_id, title, status, due_date, start_date, recurrence_pattern, completed_at',
    )
    .eq('status', 'completed')
    .not('recurrence_pattern', 'is', null)

  if (error) {
    console.error('Failed to load candidate tasks:', error)
    throw error
  }

  const tasks = (data as TaskRow[]) ?? []
  console.log(`Found ${tasks.length} completed recurring tasks to inspect.`)

  // Step 2: Compute fixes using the same recurrence semantics as toggleTaskComplete.
  const updates: { id: string; patch: Partial<TaskRow> }[] = []
  for (const task of tasks) {
    const patch = computeFixedRecurringState(task)
    if (!patch) continue
    updates.push({ id: task.id, patch })
  }

  if (updates.length === 0) {
    console.log('No recurring tasks require changes.')
    return
  }

  console.log(`Applying fixes to ${updates.length} recurring tasks...`)

  // Step 3: Apply updates in small batches to avoid large single writes.
  const batchSize = 50
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    const { error: updateError } = await supabase
      .from('tasks')
      .upsert(
        batch.map((u) => ({
          id: u.id,
          status: u.patch.status,
          due_date: u.patch.due_date,
          start_date: u.patch.start_date,
          completed_at: u.patch.completed_at,
        })),
        { onConflict: 'id' },
      )

    if (updateError) {
      console.error('Error applying batch update:', updateError)
      throw updateError
    }
  }

  console.log('Recurring task data fix completed successfully.')
}

// CLI wiring is handled externally (e.g. via ts-node runner calling fixRecurringTasksOnce()).

