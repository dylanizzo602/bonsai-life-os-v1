/* habitReminderOccurrences.test: per-day missed habit occurrence enumeration */

import { describe, expect, it } from 'vitest'
import {
  habitReminderPushDedupeKey,
  isHabitOccurrenceResolved,
  listMissedHabitOccurrences,
} from './habitReminderOccurrences'

const baseHabit = {
  id: 'habit-1',
  created_at: '2026-06-01T12:00:00.000Z',
  frequency: 'daily' as const,
  frequency_target: null,
  monthly_interval: 1,
  monthly_day: 1,
  reminder_time: '09:00',
  todo_remind_at: '2026-06-01T14:00:00.000Z',
}

const baseTask = {
  due_date: '2026-06-01T14:00:00.000Z',
}

describe('listMissedHabitOccurrences', () => {
  it('returns separate instances for consecutive missed daily days', () => {
    const missed = listMissedHabitOccurrences({
      habit: baseHabit,
      task: baseTask,
      entries: [],
      timeZone: 'America/New_York',
      todayYMD: '2026-06-02',
      nowMs: new Date('2026-06-02T15:00:00.000Z').getTime(),
    })

    expect(missed.map((m) => m.occurrenceDate)).toEqual(['2026-06-01', '2026-06-02'])
  })

  it('skips resolved occurrence dates', () => {
    const missed = listMissedHabitOccurrences({
      habit: baseHabit,
      task: baseTask,
      entries: [{ entry_date: '2026-06-01', status: 'completed' }],
      timeZone: 'America/New_York',
      todayYMD: '2026-06-02',
      nowMs: new Date('2026-06-02T15:00:00.000Z').getTime(),
    })

    expect(missed.map((m) => m.occurrenceDate)).toEqual(['2026-06-02'])
  })

  it('excludes future reminder times on today', () => {
    const missed = listMissedHabitOccurrences({
      habit: baseHabit,
      task: baseTask,
      entries: [],
      timeZone: 'America/New_York',
      todayYMD: '2026-06-02',
      nowMs: new Date('2026-06-02T08:00:00.000Z').getTime(),
    })

    expect(missed.map((m) => m.occurrenceDate)).toEqual(['2026-06-01'])
  })
})

describe('isHabitOccurrenceResolved', () => {
  it('treats minimum and skipped as resolved', () => {
    expect(
      isHabitOccurrenceResolved([{ entry_date: '2026-06-01', status: 'minimum' }], '2026-06-01'),
    ).toBe(true)
    expect(
      isHabitOccurrenceResolved([{ entry_date: '2026-06-01', status: 'skipped' }], '2026-06-01'),
    ).toBe(true)
  })
})

describe('habitReminderPushDedupeKey', () => {
  it('includes habit id and occurrence date', () => {
    expect(habitReminderPushDedupeKey('abc', '2026-06-01')).toBe(
      'habit_reminder_due:abc:2026-06-01',
    )
  })
})
