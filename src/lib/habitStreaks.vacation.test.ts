/* habitStreaks.vacation.test: streak preservation during vacation days */

import { describe, expect, it } from 'vitest'
import { getHabitStreaks } from './habitStreaks'
import type { VacationDayPredicate } from './vacationMode'

const vacationRange: VacationDayPredicate = (ymd) => ymd >= '2026-06-10' && ymd <= '2026-06-12'

describe('getHabitStreaks with vacation days', () => {
  it('preserves daily streak across a vacation gap', () => {
    const entries = [
      { date: '2026-06-09', status: 'completed' as const },
      { date: '2026-06-08', status: 'completed' as const },
      { date: '2026-06-07', status: 'completed' as const },
    ]
    const withoutVacation = getHabitStreaks(entries, '2026-06-12', 'daily', null)
    expect(withoutVacation.currentStreak).toBe(0)

    const withVacation = getHabitStreaks(
      entries,
      '2026-06-12',
      'daily',
      null,
      undefined,
      undefined,
      vacationRange,
    )
    expect(withVacation.currentStreak).toBe(3)
  })

  it('does not apply vacation neutral outside the configured range', () => {
    const entries = [{ date: '2026-06-09', status: 'completed' as const }]
    const result = getHabitStreaks(
      entries,
      '2026-06-20',
      'daily',
      null,
      undefined,
      undefined,
      vacationRange,
    )
    expect(result.currentStreak).toBe(0)
  })

  it('allows weekly streak when vacation covers a scheduled weekday', () => {
    /* Bitmask: Mon(1) + Wed(4) + Fri(16) = 21 */
    const weekMask = 21
    /* Week of Sun 2026-06-01: Mon/Wed/Fri habit — Wed is vacation-neutral */
    const entries = [
      { date: '2026-06-02', status: 'completed' as const },
      { date: '2026-06-06', status: 'completed' as const },
    ]
    const wedVacation: VacationDayPredicate = (ymd) => ymd === '2026-06-04'
    const result = getHabitStreaks(
      entries,
      '2026-06-12',
      'weekly',
      weekMask,
      undefined,
      undefined,
      wedVacation,
    )
    expect(result.currentStreak).toBe(1)
  })
})
