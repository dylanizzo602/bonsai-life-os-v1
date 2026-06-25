/* inspirationalQuotes.test: daily quote rotation */

import { describe, expect, it } from 'vitest'
import {
  getDailyQuote,
  getDailyQuoteIndex,
  INSPIRATIONAL_QUOTES,
} from './inspirationalQuotes'

describe('inspirationalQuotes', () => {
  it('contains 100 quotes', () => {
    expect(INSPIRATIONAL_QUOTES).toHaveLength(100)
  })

  it('returns the same quote for the entire local calendar day', () => {
    const morning = new Date(2026, 5, 25, 8, 30)
    const evening = new Date(2026, 5, 25, 22, 15)
    expect(getDailyQuote(morning)).toEqual(getDailyQuote(evening))
  })

  it('advances to a different quote on the next local calendar day', () => {
    const today = new Date(2026, 5, 25, 12)
    const tomorrow = new Date(2026, 5, 26, 12)
    expect(getDailyQuoteIndex(today)).not.toBe(getDailyQuoteIndex(tomorrow))
  })

  it('cycles through all quotes over 100 consecutive days', () => {
    const indices = new Set<number>()
    for (let day = 0; day < 100; day += 1) {
      indices.add(getDailyQuoteIndex(new Date(2026, 0, 1 + day)))
    }
    expect(indices.size).toBe(100)
  })
})
