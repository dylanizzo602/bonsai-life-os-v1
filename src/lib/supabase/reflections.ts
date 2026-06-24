/* Reflection entries data access: create and list reflection entries (e.g. morning briefings) */

import { supabase } from './client'
import { DateTime } from 'luxon'
import { cachedQuery, invalidateQueryCache, QUERY_CACHE_PREFIX } from './queryCache'
import type { ReflectionEntry, CreateReflectionEntryInput, UpdateReflectionEntryInput, JournalResponses } from '../../features/reflections/types'

/* Zoned day range helper: compute [startOfDay, nextDayStart) in UTC for a given IANA time zone */
function getZonedDayRangeUtc(timeZone: string, baseInstant?: DateTime): { from: string; to: string } {
  /* Base instant: default to now in the requested zone */
  const base = (baseInstant ?? DateTime.now()).setZone(timeZone)
  const from = base.startOf('day').toUTC().toISO()!
  const to = base.plus({ days: 1 }).startOf('day').toUTC().toISO()!
  return { from, to }
}

/* Closest entry helper: pick the reflection whose created_at is nearest a target local day */
function pickClosestEntryToTargetDay(
  entries: ReflectionEntry[],
  targetDay: DateTime,
): ReflectionEntry | null {
  if (entries.length === 0) return null

  const targetMs = targetDay.toUTC().toMillis()
  let closest = entries[0]
  let minDist = Math.abs(new Date(closest.created_at).getTime() - targetMs)

  for (let i = 1; i < entries.length; i++) {
    const dist = Math.abs(new Date(entries[i].created_at).getTime() - targetMs)
    if (dist < minDist) {
      minDist = dist
      closest = entries[i]
    }
  }

  return closest
}

/** Invalidate cached morning-briefing completion checks */
function invalidateBriefingTodayCache(): void {
  invalidateQueryCache(QUERY_CACHE_PREFIX.reflectionsBriefingToday)
}

/** Cache key for today's briefing completion check */
function buildBriefingTodayCacheKey(timeZone: string): string {
  const dayKey = DateTime.now().setZone(timeZone).toISODate() ?? 'unknown'
  return `${QUERY_CACHE_PREFIX.reflectionsBriefingToday}${timeZone}:${dayKey}`
}

/**
 * Create a new reflection entry (e.g. after completing morning briefing).
 */
export async function createReflectionEntry(
  input: CreateReflectionEntryInput,
): Promise<ReflectionEntry> {
  const { data, error } = await supabase
    .from('reflection_entries')
    .insert({
      type: input.type,
      title: input.title ?? null,
      responses: input.responses ?? {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating reflection entry:', error)
    throw error
  }
  if (input.type === 'morning_briefing') {
    invalidateBriefingTodayCache()
  }
  return data as ReflectionEntry
}

/**
 * Create or update today's morning briefing entry so only one reflection is stored per day.
 * If a 'morning_briefing' entry exists for today, update its title/responses instead of inserting a new row.
 */
export async function saveOrUpdateMorningBriefingEntryForToday(
  input: Omit<CreateReflectionEntryInput, 'type'>,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<ReflectionEntry> {
  /* Today's window: compute in the user's effective zone, query in UTC */
  const { from, to } = getZonedDayRangeUtc(timeZone)

  const { data: existing, error: existingError } = await supabase
    .from('reflection_entries')
    .select('*')
    .eq('type', 'morning_briefing')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true })

  if (existingError) {
    console.error('Error checking existing morning briefing entry for today:', existingError)
    throw existingError
  }

  const existingEntries = (existing as ReflectionEntry[] | null) ?? []
  const existingEntry = existingEntries[0]

  if (existingEntry) {
    // If multiple entries exist for today, keep the earliest and delete the rest so only one remains.
    if (existingEntries.length > 1) {
      const extraIds = existingEntries.slice(1).map((e) => e.id)
      const { error: deleteError } = await supabase
        .from('reflection_entries')
        .delete()
        .in('id', extraIds)
      if (deleteError) {
        console.error('Error cleaning up extra morning briefing entries for today:', deleteError)
      }
    }

    const { data, error } = await supabase
      .from('reflection_entries')
      .update({
        title: input.title ?? existingEntry.title,
        responses: input.responses ?? existingEntry.responses,
      })
      .eq('id', existingEntry.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating existing morning briefing entry for today:', error)
      throw error
    }
    invalidateBriefingTodayCache()
    return data as ReflectionEntry
  }

  const created = await createReflectionEntry({
    ...input,
    type: 'morning_briefing',
  })
  return created
}

/**
 * Fetch a single reflection entry by id.
 */
export async function getReflectionEntry(id: string): Promise<ReflectionEntry | null> {
  const { data, error } = await supabase
    .from('reflection_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching reflection entry:', error)
    throw error
  }
  return data as ReflectionEntry
}

/**
 * Update an existing reflection entry (e.g. journal title/body edits).
 */
export async function updateReflectionEntry(
  id: string,
  input: UpdateReflectionEntryInput,
): Promise<ReflectionEntry> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.responses !== undefined) payload.responses = input.responses
  if (input.created_at !== undefined) payload.created_at = input.created_at

  const { data, error } = await supabase
    .from('reflection_entries')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating reflection entry:', error)
    throw error
  }
  return data as ReflectionEntry
}

/**
 * Fetch today's morning briefing entry for the user's calendar day (if any).
 */
export async function getTodaysMorningBriefingEntry(
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<ReflectionEntry | null> {
  const { from, to } = getZonedDayRangeUtc(timeZone)

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('*')
    .eq('type', 'morning_briefing')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching today\'s morning briefing entry:', error)
    return null
  }

  const rows = (data as ReflectionEntry[] | null) ?? []
  return rows[0] ?? null
}

/**
 * Fetch reflection entries for listing (e.g. Reflections page), newest first.
 */
export async function getReflectionEntriesPage(options?: {
  /** 1-based page number */
  page?: number
  /** Number of entries per page */
  pageSize?: number
  /** Optional search query (title or journal body) */
  search?: string
  /** Optional type filter */
  types?: string[]
}): Promise<{ entries: ReflectionEntry[]; total: number }> {
  /* Pagination inputs: clamp to safe defaults to avoid invalid ranges */
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.max(1, options?.pageSize ?? 10)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const types =
    options?.types && options.types.length > 0
      ? options.types
      : ['morning_briefing', 'weekly_briefing', 'journal']

  /* Base query: filtered reflection types, newest first */
  let query = supabase
    .from('reflection_entries')
    .select('*', { count: 'exact' })
    .in('type', types)
    .order('created_at', { ascending: false })

  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`
    query = query.or(
      `title.ilike.${term},responses->>body.ilike.${term}`,
    )
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error('Error fetching reflection entries page:', error)
    throw error
  }

  return { entries: (data as ReflectionEntry[]) ?? [], total: count ?? 0 }
}

/**
 * Fetch all journal entries for the current user (for CSV export).
 * Uses pagination to avoid limits for large histories.
 */
export async function getAllJournalEntriesForExport(): Promise<ReflectionEntry[]> {
  /* Pagination settings: fetch in chunks so exports can scale */
  const pageSize = 500
  let from = 0
  let all: ReflectionEntry[] = []

  while (true) {
    const to = from + pageSize - 1

    const { data, error } = await supabase
      .from('reflection_entries')
      .select('*')
      .eq('type', 'journal')
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Error fetching journal entries for export:', error)
      throw error
    }

    const page = (data as ReflectionEntry[]) ?? []
    all = all.concat(page)
    if (page.length < pageSize) break
    from += pageSize
  }

  return all
}

/** @deprecated Use getAllJournalEntriesForExport */
export async function getAllMorningBriefingEntries(): Promise<ReflectionEntry[]> {
  return getAllJournalEntriesForExport()
}

/**
 * Bulk insert journal entries from CSV import.
 * Inserts in chunks so large imports don't exceed request limits.
 */
export async function bulkInsertJournalEntriesFromCsv(
  rows: Array<{
    title: string | null
    responses: JournalResponses | Record<string, unknown>
    created_at?: string | null
  }>,
): Promise<void> {
  /* Chunk size: keep payloads reasonable while minimizing round trips */
  const chunkSize = 200
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const payload = chunk.map((r) => ({
      type: 'journal',
      title: r.title ?? null,
      responses: r.responses ?? { body: '' },
      ...(r.created_at ? { created_at: r.created_at } : {}),
    }))

    const { error } = await supabase.from('reflection_entries').insert(payload)
    if (error) {
      console.error('Error bulk inserting journal entries from CSV:', error)
      throw error
    }
  }
}

/** @deprecated Use bulkInsertJournalEntriesFromCsv */
export async function bulkInsertMorningBriefingEntries(
  rows: Array<{
    title: string | null
    responses: Record<string, unknown>
    created_at?: string | null
  }>,
): Promise<void> {
  return bulkInsertJournalEntriesFromCsv(rows)
}

/**
 * Return true if the user has completed a morning briefing today (at least one reflection entry
 * with type 'morning_briefing' and created_at on today's calendar day).
 */
export async function getHasCompletedMorningBriefingToday(
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<boolean> {
  return cachedQuery(buildBriefingTodayCacheKey(timeZone), () =>
    fetchHasCompletedMorningBriefingTodayUncached(timeZone),
  )
}

/** Uncached morning briefing completion check for today */
async function fetchHasCompletedMorningBriefingTodayUncached(
  timeZone: string,
): Promise<boolean> {
  /* Today's window: compute in the user's effective zone, query in UTC */
  const { from, to } = getZonedDayRangeUtc(timeZone)

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('id')
    .eq('type', 'morning_briefing')
    .gte('created_at', from)
    .lt('created_at', to)
    .limit(1)

  if (error) {
    console.error('Error checking morning briefing today:', error)
    return false
  }
  return (data?.length ?? 0) > 0
}

/**
 * Compute the start (inclusive) and end (exclusive) ISO week window for the provided date.
 * ISO week starts on Monday; the window is [Monday 00:00, next Monday 00:00).
 */
function getIsoWeekRange(date: Date): { from: string; to: string } {
  const base = new Date(date)
  const day = base.getDay() // 0=Sun ... 6=Sat
  const daysSinceMonday = (day + 6) % 7

  const weekStart = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  weekStart.setDate(weekStart.getDate() - daysSinceMonday)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return { from: weekStart.toISOString(), to: weekEnd.toISOString() }
}

/* Streak helper: normalize a reflection created_at into a local calendar date key (YYYY-MM-DD) */
function createdAtToLocalYMD(createdAtIso: string, timeZone: string): string | null {
  const dt = DateTime.fromISO(createdAtIso, { setZone: true }).setZone(timeZone)
  if (!dt.isValid) return null
  return dt.toISODate()
}

/* Streak helper: create a stable ISO week key for the provided instant in a time zone */
function createdAtToIsoWeekKey(createdAtIso: string, timeZone: string): string | null {
  const dt = DateTime.fromISO(createdAtIso, { setZone: true }).setZone(timeZone)
  if (!dt.isValid) return null
  const weekYear = dt.weekYear
  const weekNumber = dt.weekNumber
  return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * Return true if the user has completed a weekly briefing in the current ISO week.
 * Completion is defined as a reflection entry with type 'weekly_briefing' created within this week.
 */
export async function getHasCompletedWeeklyBriefingThisWeek(): Promise<boolean> {
  const { from, to } = getIsoWeekRange(new Date())

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('id')
    .eq('type', 'weekly_briefing')
    .gte('created_at', from)
    .lt('created_at', to)
    .limit(1)

  if (error) {
    console.error('Error checking weekly briefing this week:', error)
    return false
  }
  return (data?.length ?? 0) > 0
}

/**
 * Return the current morning briefing streak (consecutive calendar days ending today in `timeZone`).
 * A day counts as completed if there is at least one 'morning_briefing' entry whose created_at falls on that local day.
 */
export async function getMorningBriefingStreak(
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
  options?: { maxLookbackDays?: number },
): Promise<number> {
  /* Query window: fetch recent entries (bounded) and compute streak client-side */
  const maxLookbackDays = Math.max(7, options?.maxLookbackDays ?? 60)
  const earliest = DateTime.now().setZone(timeZone).startOf('day').minus({ days: maxLookbackDays }).toUTC().toISO()!

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('created_at')
    .eq('type', 'morning_briefing')
    .gte('created_at', earliest)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('Error fetching morning briefing streak entries:', error)
    return 0
  }

  /* Distinct local-day set: multiple entries in a day count once */
  const daySet = new Set<string>()
  for (const row of (data ?? []) as Array<{ created_at: string }>) {
    const ymd = createdAtToLocalYMD(row.created_at, timeZone)
    if (ymd) daySet.add(ymd)
  }

  /* Streak: count backwards from today while each day exists */
  let streak = 0
  let cursor = DateTime.now().setZone(timeZone).startOf('day')
  while (streak < maxLookbackDays) {
    const key = cursor.toISODate()
    if (!key || !daySet.has(key)) break
    streak += 1
    cursor = cursor.minus({ days: 1 })
  }

  return streak
}

/**
 * Return the current weekly briefing streak (consecutive ISO weeks ending this week in `timeZone`).
 * A week counts as completed if there is at least one 'weekly_briefing' entry created in that ISO week.
 */
export async function getWeeklyBriefingStreak(
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
  options?: { maxLookbackWeeks?: number },
): Promise<number> {
  /* Query window: fetch recent entries (bounded) and compute streak client-side */
  const maxLookbackWeeks = Math.max(4, options?.maxLookbackWeeks ?? 26)
  const earliest = DateTime.now()
    .setZone(timeZone)
    .startOf('week')
    .minus({ weeks: maxLookbackWeeks })
    .toUTC()
    .toISO()!

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('created_at')
    .eq('type', 'weekly_briefing')
    .gte('created_at', earliest)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching weekly briefing streak entries:', error)
    return 0
  }

  /* Distinct ISO-week set */
  const weekSet = new Set<string>()
  for (const row of (data ?? []) as Array<{ created_at: string }>) {
    const key = createdAtToIsoWeekKey(row.created_at, timeZone)
    if (key) weekSet.add(key)
  }

  /* Streak: count backwards from current ISO week */
  let streak = 0
  let cursor = DateTime.now().setZone(timeZone)
  while (streak < maxLookbackWeeks) {
    const key = `${cursor.weekYear}-W${String(cursor.weekNumber).padStart(2, '0')}`
    if (!weekSet.has(key)) break
    streak += 1
    cursor = cursor.minus({ weeks: 1 })
  }

  return streak
}

/**
 * Create or update this week's weekly briefing entry so only one is stored per ISO week.
 * If an entry exists in this week window, update its title/responses instead of inserting a new row.
 */
export async function saveOrUpdateWeeklyBriefingEntryForThisWeek(
  input: Omit<CreateReflectionEntryInput, 'type'>,
): Promise<ReflectionEntry> {
  const { from, to } = getIsoWeekRange(new Date())

  const { data: existing, error: existingError } = await supabase
    .from('reflection_entries')
    .select('*')
    .eq('type', 'weekly_briefing')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true })

  if (existingError) {
    console.error('Error checking existing weekly briefing entry for this week:', existingError)
    throw existingError
  }

  const existingEntries = (existing as ReflectionEntry[] | null) ?? []
  const existingEntry = existingEntries[0]

  if (existingEntry) {
    // If multiple entries exist for this week, keep the earliest and delete the rest so only one remains.
    if (existingEntries.length > 1) {
      const extraIds = existingEntries.slice(1).map((e) => e.id)
      const { error: deleteError } = await supabase.from('reflection_entries').delete().in('id', extraIds)
      if (deleteError) {
        console.error('Error cleaning up extra weekly briefing entries for this week:', deleteError)
      }
    }

    const { data, error } = await supabase
      .from('reflection_entries')
      .update({
        title: input.title ?? existingEntry.title,
        responses: input.responses ?? existingEntry.responses,
      })
      .eq('id', existingEntry.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating existing weekly briefing entry for this week:', error)
      throw error
    }
    return data as ReflectionEntry
  }

  return createReflectionEntry({
    ...input,
    type: 'weekly_briefing',
  })
}

/**
 * Fetch the reflection entry closest to one year ago today (for "One year ago today..." widget).
 * Looks in a window of 7 days around that date and returns the entry whose created_at is closest.
 */
export async function getReflectionEntryOneYearAgo(): Promise<ReflectionEntry | null> {
  /* Inputs: interpret "today" in the user's time zone to avoid UTC rollover issues */
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  /* Target day: one calendar year ago in the user's local time zone */
  const targetDay = DateTime.now().setZone(timeZone).minus({ years: 1 }).startOf('day')

  /* Window range: ±7 days around the target day, queried in UTC */
  const windowDays = 7
  const fromStr = targetDay.minus({ days: windowDays }).toUTC().toISO()!
  const toStr = targetDay.plus({ days: windowDays + 1 }).toUTC().toISO()!
  const targetMs = targetDay.toUTC().toMillis()

  const { data, error } = await supabase
    .from('reflection_entries')
    .select('*')
    .eq('type', 'morning_briefing')
    .gte('created_at', fromStr)
    .lt('created_at', toStr)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching reflection entry one year ago:', error)
    return null
  }

  const entries = (data as ReflectionEntry[]) ?? []
  if (entries.length === 0) return null

  let closest = entries[0]
  let minDist = Math.abs(new Date(closest.created_at).getTime() - targetMs)
  for (let i = 1; i < entries.length; i++) {
    const dist = Math.abs(new Date(entries[i].created_at).getTime() - targetMs)
    if (dist < minDist) {
      minDist = dist
      closest = entries[i]
    }
  }
  return closest
}

/**
 * Delete a reflection entry by id (used when user deletes a saved reflection).
 */
export async function deleteReflectionEntry(id: string): Promise<void> {
  const { error } = await supabase.from('reflection_entries').delete().eq('id', id)

  if (error) {
    console.error('Error deleting reflection entry:', error)
    throw error
  }
}

/**
 * Fetch a random reflection entry from "today" in a prior year (e.g. "3 years ago today…").
 * Searches year-by-year back from now in the user's time zone and returns one random match.
 * Uses a ±windowDays range around each target day (same approach as getReflectionEntryOneYearAgo).
 */
export async function getRandomReflectionEntryYearsAgoToday(options?: {
  /** IANA time zone used to define "today" (calendar day). */
  timeZone?: string
  /** Single reflection entry type to include (overrides default types when set). */
  type?: string
  /** Maximum number of years to look back. */
  maxYearsBack?: number
  /** Days before/after the target day to search for entries. */
  windowDays?: number
}): Promise<{ entry: ReflectionEntry; yearsAgo: number } | null> {
  /* Inputs: default to local time zone, briefing + journal entries, and a 7-day window. */
  const timeZone = options?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const types = options?.type != null ? [options.type] : ['morning_briefing', 'journal']
  const maxYearsBack = Math.max(1, options?.maxYearsBack ?? 10)
  const windowDays = Math.max(0, options?.windowDays ?? 7)

  /* Target day: interpret "today" in the user's time zone. */
  const now = DateTime.now().setZone(timeZone)

  /* Candidate entries: one closest match per prior year (if any). */
  const candidates: { entry: ReflectionEntry; yearsAgo: number }[] = []

  /* Query each prior year's calendar day with a tolerance window. */
  const perYearResults = await Promise.all(
    Array.from({ length: maxYearsBack }, (_, idx) => idx + 1).map(async (yearsAgo) => {
      const targetDay = now.minus({ years: yearsAgo }).startOf('day')
      const from = targetDay.minus({ days: windowDays }).toUTC().toISO()!
      const to = targetDay.plus({ days: windowDays + 1 }).toUTC().toISO()!

      const { data, error } = await supabase
        .from('reflection_entries')
        .select('*')
        .in('type', types)
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching reflection entries years-ago-today:', error)
        return null
      }

      const entries = (data as ReflectionEntry[]) ?? []
      const closest = pickClosestEntryToTargetDay(entries, targetDay)
      return closest ? { entry: closest, yearsAgo } : null
    }),
  )

  for (const match of perYearResults) {
    if (match) candidates.push(match)
  }
  if (candidates.length === 0) return null

  /* Random selection: pick one entry uniformly at random across all year matches. */
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return pick ?? null
}
