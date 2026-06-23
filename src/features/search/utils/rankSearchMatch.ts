/* rankSearchMatch: Client-side relevance scoring for global search */

import type { SearchIndexItem, SearchResult } from '../types'

const MAX_RESULTS = 10

/**
 * Score how well `text` matches `query` (higher is better; 0 = no match).
 */
export function scoreSearchMatch(text: string, query: string): number {
  const haystack = text.trim().toLowerCase()
  const needle = query.trim().toLowerCase()
  if (!needle) return 0
  if (!haystack) return 0

  if (haystack === needle) return 1000
  if (haystack.startsWith(needle)) return 800 - Math.min(haystack.length - needle.length, 100)

  const wordStart = haystack
    .split(/\s+/)
    .some((word) => word.startsWith(needle))
  if (wordStart) return 600 - Math.min(haystack.length - needle.length, 100)

  const idx = haystack.indexOf(needle)
  if (idx >= 0) return 400 - idx - Math.min(haystack.length - needle.length, 50)

  return 0
}

/** Best score across title and optional searchText */
function scoreIndexItem(item: SearchIndexItem, query: string): number {
  const titleScore = scoreSearchMatch(item.title, query)
  const textScore = item.searchText ? scoreSearchMatch(item.searchText, query) : 0
  return Math.max(titleScore, textScore)
}

/**
 * Filter and rank index items; return top 10 matches across all entity types.
 */
export function rankSearchResults(
  items: SearchIndexItem[],
  query: string,
): SearchResult[] {
  const q = query.trim()
  if (!q) return []

  const scored: SearchResult[] = []
  for (const item of items) {
    const score = scoreIndexItem(item, q)
    if (score > 0) {
      scored.push({ ...item, score })
    }
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  return scored.slice(0, MAX_RESULTS)
}

export { MAX_RESULTS as SEARCH_MAX_RESULTS }
