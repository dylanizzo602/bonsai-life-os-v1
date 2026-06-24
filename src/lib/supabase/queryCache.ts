/* queryCache: In-memory read-through cache with inflight deduplication for Supabase read queries */

/** Cache key prefixes — invalidate by prefix after writes in the same domain */
export const QUERY_CACHE_PREFIX = {
  tasks: 'tasks:',
  habits: 'habits:',
  habitEntries: 'habit-entries:',
  goals: 'goals:',
  milestonesByGoals: 'milestones-by-goals:',
  reflectionsBriefingToday: 'reflections:briefing-today:',
} as const

interface CacheEntry {
  data: unknown
  fetchedAt: number
}

const resultCache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

export interface CachedQueryOptions {
  /** When true, skip cached result and in-flight reuse; still updates cache on success */
  bypass?: boolean
}

/**
 * Run a read query with inflight deduplication and read-through caching.
 * Failed fetches are not cached.
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CachedQueryOptions,
): Promise<T> {
  if (!options?.bypass) {
    const hit = resultCache.get(key)
    if (hit) {
      return hit.data as T
    }

    const pending = inflight.get(key)
    if (pending) {
      return pending as Promise<T>
    }
  }

  const promise = fetcher()
    .then((data) => {
      resultCache.set(key, { data, fetchedAt: Date.now() })
      inflight.delete(key)
      return data
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, promise)
  return promise as Promise<T>
}

/** Drop all cache entries whose key starts with the given prefix */
export function invalidateQueryCache(prefix: string): void {
  for (const key of resultCache.keys()) {
    if (key.startsWith(prefix)) {
      resultCache.delete(key)
    }
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) {
      inflight.delete(key)
    }
  }
}

/** Clear every cached read (e.g. on sign-out to avoid cross-user bleed) */
export function clearQueryCache(): void {
  resultCache.clear()
  inflight.clear()
}
