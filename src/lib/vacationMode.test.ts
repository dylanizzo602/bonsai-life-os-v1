/* vacationMode.test: vacation mode metadata parsing and status */

import { describe, expect, it } from 'vitest'
import {
  getVacationModeStatus,
  isVacationDay,
  isVacationModeActive,
  isVacationModeExpired,
  parseVacationModeFromMetadata,
  validateVacationModeRange,
} from './vacationMode'

const activeMeta = {
  vacation_mode_enabled: true,
  vacation_mode_start: '2026-06-01',
  vacation_mode_end: '2026-06-07',
}

describe('parseVacationModeFromMetadata', () => {
  it('parses enabled range from metadata', () => {
    expect(parseVacationModeFromMetadata(activeMeta)).toEqual({
      enabled: true,
      start: '2026-06-01',
      end: '2026-06-07',
    })
  })

  it('returns inactive when disabled', () => {
    expect(parseVacationModeFromMetadata({ vacation_mode_enabled: false })).toEqual({
      enabled: false,
      start: null,
      end: null,
    })
  })
})

describe('isVacationDay', () => {
  it('is inclusive on start and end', () => {
    expect(isVacationDay('2026-06-01', '2026-06-01', '2026-06-03')).toBe(true)
    expect(isVacationDay('2026-06-03', '2026-06-01', '2026-06-03')).toBe(true)
    expect(isVacationDay('2026-05-31', '2026-06-01', '2026-06-03')).toBe(false)
    expect(isVacationDay('2026-06-04', '2026-06-01', '2026-06-03')).toBe(false)
  })
})

describe('isVacationModeActive', () => {
  it('is active only inside the range when enabled', () => {
    expect(isVacationModeActive(activeMeta, '2026-05-31')).toBe(false)
    expect(isVacationModeActive(activeMeta, '2026-06-03')).toBe(true)
    expect(isVacationModeActive(activeMeta, '2026-06-08')).toBe(false)
  })
})

describe('getVacationModeStatus', () => {
  it('returns scheduled before start', () => {
    expect(getVacationModeStatus(activeMeta, '2026-05-31')).toBe('scheduled')
  })

  it('returns active during range', () => {
    expect(getVacationModeStatus(activeMeta, '2026-06-03')).toBe('active')
  })

  it('returns expired after end', () => {
    expect(getVacationModeStatus(activeMeta, '2026-06-08')).toBe('expired')
  })
})

describe('isVacationModeExpired', () => {
  it('is true only after end date', () => {
    expect(isVacationModeExpired(activeMeta, '2026-06-07')).toBe(false)
    expect(isVacationModeExpired(activeMeta, '2026-06-08')).toBe(true)
  })
})

describe('validateVacationModeRange', () => {
  it('rejects end before start', () => {
    expect(() => validateVacationModeRange('2026-06-10', '2026-06-01')).toThrow()
  })

  it('accepts valid range', () => {
    expect(() => validateVacationModeRange('2026-06-01', '2026-06-10')).not.toThrow()
  })
})
