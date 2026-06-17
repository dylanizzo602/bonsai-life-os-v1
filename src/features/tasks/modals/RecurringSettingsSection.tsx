/* RecurringSettingsSection: Collapsible repeat options for the schedule date picker */

import { useCallback } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { RecurrencePattern, RecurrenceFreq } from '../../../lib/recurrence'

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SET_POS_OPTIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: 5, label: 'Fifth' },
]

const FREQ_OPTIONS: { value: RecurrenceFreq | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

const FREQ_UNIT_LABEL: Record<RecurrenceFreq, string> = {
  day: 'days',
  week: 'weeks',
  month: 'months',
  year: 'years',
}

export interface RecurringSettingsSectionProps {
  /** Current recurrence pattern (parsed) or null */
  value: RecurrencePattern | null
  /** Callback when recurrence changes */
  onChange: (pattern: RecurrencePattern | null) => void
  /** Show "Reopen checklist items" checkbox */
  hasChecklists: boolean
  /** Anchor date (YYYY-MM-DD) to prefill monthly/yearly from due date */
  anchorDueDate?: string | null
}

/** Build default pattern for a frequency, using anchor date for monthly/yearly prefill */
function defaultPatternForFreq(
  freq: Exclude<RecurrenceFreq, never>,
  anchorDueDate?: string | null
): RecurrencePattern {
  const base: RecurrencePattern = {
    freq,
    interval: 1,
    until: null,
    reopenChecklist: false,
  }
  if (anchorDueDate) {
    const [y, m, d] = anchorDueDate.split('-').map(Number)
    if (freq === 'week') {
      const dayOfWeek = new Date(y, (m ?? 1) - 1, d ?? 1).getDay()
      base.byDay = [DAY_CODES[dayOfWeek]]
    } else if (freq === 'month') {
      base.byMonthDay = d ?? 1
    } else if (freq === 'year') {
      base.byMonth = m ?? 1
      base.byMonthDay = d ?? 1
    }
  }
  return base
}

/** Format YYYY-MM-DD as "Mon d, yyyy" for the ends-on display row */
function formatEndsOnDisplay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const month = MONTH_NAMES_SHORT[(m ?? 1) - 1]
  return `${month} ${d}, ${y}`
}

export function RecurringSettingsSection({
  value,
  onChange,
  hasChecklists,
  anchorDueDate,
}: RecurringSettingsSectionProps) {
  /* Internal representation: "none" or a valid freq; when "none" we call onChange(null) */
  const freqValue: RecurrenceFreq | 'none' = value ? value.freq : 'none'
  const interval = value?.interval ?? 1
  const byDay = value?.byDay
  const byMonthDay = value?.byMonthDay
  const bySetPos = value?.bySetPos
  const byMonth = value?.byMonth ?? 1
  const reoccurForever = !value?.until
  const endsOnDate = value?.until ?? ''
  const reopenChecklist = value?.reopenChecklist ?? false
  const monthlyVariant = value?.bySetPos != null ? 'by_week' : 'on_date'

  /* Emit pattern when form state would produce a valid pattern */
  const emitPattern = useCallback(
    (updates: Partial<Omit<RecurrencePattern, 'freq'>> & { freq?: RecurrenceFreq | 'none' }) => {
      const newFreq = updates.freq
      if (newFreq === 'none') {
        onChange(null)
        return
      }
      const f = newFreq ?? value?.freq
      if (!f || (f as string) === 'none') {
        onChange(null)
        return
      }
      const prev = value ?? defaultPatternForFreq(f as RecurrenceFreq, anchorDueDate)
      const next: RecurrencePattern = {
        ...prev,
        ...updates,
        freq: f as RecurrenceFreq,
        interval: Math.max(1, updates.interval ?? prev.interval),
        until: updates.until !== undefined ? updates.until : prev.until,
        reopenChecklist: updates.reopenChecklist ?? prev.reopenChecklist,
      }
      onChange(next)
    },
    [value, onChange, anchorDueDate]
  )

  /* Frequency pill selection */
  const handleFreqSelect = (freq: RecurrenceFreq | 'none') => {
    if (freq === 'none') {
      onChange(null)
      return
    }
    emitPattern({ freq })
  }

  /* Interval change */
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10)
    if (isNaN(n) || n < 1) return
    emitPattern({ interval: n })
  }

  /* Weekly: toggle day */
  const toggleDay = (code: string) => {
    const days = Array.isArray(byDay) ? [...byDay] : byDay ? [byDay] : []
    const set = new Set(days)
    if (set.has(code)) {
      set.delete(code)
    } else {
      set.add(code)
    }
    const arr = Array.from(set)
    if (arr.length === 0) return
    emitPattern({ byDay: arr })
  }

  /* Monthly on date: day of month (1-31 or -1 for last) */
  const handleMonthDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    const n = v === 'last' ? -1 : parseInt(v, 10)
    emitPattern({ byMonthDay: n, bySetPos: undefined })
  }

  /* Monthly by week: variant + setPos + day; always preserve interval */
  const handleMonthlyVariantChange = (variant: 'on_date' | 'by_week') => {
    if (variant === 'on_date') {
      const day = anchorDueDate ? parseInt(anchorDueDate.slice(8, 10), 10) : 15
      emitPattern({ byMonthDay: day, bySetPos: undefined, byDay: undefined })
    } else {
      const dayOfWeek = anchorDueDate
        ? DAY_CODES[new Date(anchorDueDate).getDay()]
        : 'MO'
      emitPattern({ bySetPos: 2, byDay: dayOfWeek, byMonthDay: undefined, interval: interval })
    }
  }

  const handleSetPosChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    emitPattern({ bySetPos: parseInt(e.target.value, 10), interval })
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    emitPattern({ byMonth: parseInt(e.target.value, 10), interval })
  }

  const handleYearDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10)
    if (isNaN(n) || n < 1 || n > 31) return
    emitPattern({ byMonthDay: n, interval })
  }

  const handleReoccurForeverChange = (checked: boolean) => {
    if (checked) {
      emitPattern({ until: null })
    } else {
      const d = endsOnDate || anchorDueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
      emitPattern({ until: d })
    }
  }

  const handleEndsOnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value || null
    emitPattern({ until: d })
  }

  const handleReopenChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emitPattern({ reopenChecklist: e.target.checked })
  }

  const endsOnDisplay =
    endsOnDate || anchorDueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)

  /* Root: frequency pills and conditional fields */
  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-hidden sm:gap-6">
      {/* Frequency toggle pills */}
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
        {FREQ_OPTIONS.map((opt) => {
          const isSelected = freqValue === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFreqSelect(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors sm:px-4 ${
                isSelected
                  ? 'border-sage bg-sage font-bold text-white'
                  : 'border-outline-variant hover:border-sage'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Frequency-specific UI (hidden when none) */}
      {freqValue !== 'none' && (
        <div className="flex flex-col gap-6 min-w-0">
          {/* Interval row */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-on-surface">Every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={handleIntervalChange}
              className="w-16 rounded border border-outline-variant bg-surface p-1.5 text-center text-sm focus:border-sage focus:ring-sage"
              aria-label="Recurrence interval"
            />
            <span className="text-sm font-medium text-on-surface">{FREQ_UNIT_LABEL[freqValue]}</span>
          </div>

          {/* Weekly: day-of-week circles */}
          {freqValue === 'week' && (
            <div className="flex gap-2 flex-wrap">
              {DAY_CODES.map((code, i) => {
                const isSelected = Array.isArray(byDay) ? byDay.includes(code) : byDay === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleDay(code)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-colors ${
                      isSelected
                        ? 'border-sage bg-sage font-bold text-white'
                        : 'border-outline-variant hover:bg-sage/10'
                    }`}
                    aria-label={`${DAY_LABELS[i]} ${isSelected ? 'selected' : 'not selected'}`}
                  >
                    {DAY_LABELS[i]}
                  </button>
                )
              })}
            </div>
          )}

          {/* Monthly: on date vs by week */}
          {freqValue === 'month' && (
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex gap-3 flex-wrap">
                <label className="flex cursor-pointer items-center gap-1.5 shrink-0">
                  <input
                    type="radio"
                    name="monthly-variant"
                    checked={monthlyVariant === 'on_date'}
                    onChange={() => handleMonthlyVariantChange('on_date')}
                    className="text-sage focus:ring-sage"
                  />
                  <span className="text-sm text-on-surface-variant">on date</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 shrink-0">
                  <input
                    type="radio"
                    name="monthly-variant"
                    checked={monthlyVariant === 'by_week'}
                    onChange={() => handleMonthlyVariantChange('by_week')}
                    className="text-sage focus:ring-sage"
                  />
                  <span className="text-sm text-on-surface-variant">by week</span>
                </label>
              </div>
              {monthlyVariant === 'on_date' && (
                <select
                  value={byMonthDay === -1 ? 'last' : String(byMonthDay ?? 1)}
                  onChange={handleMonthDayChange}
                  className="w-full max-w-[8rem] rounded border border-outline-variant bg-surface px-2 py-1 text-sm text-on-surface focus:border-sage focus:ring-sage"
                  aria-label="Day of month"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`}
                    </option>
                  ))}
                  <option value="last">last day</option>
                </select>
              )}
              {monthlyVariant === 'by_week' && (
                <div className="flex flex-col gap-2 min-w-0">
                  <select
                    value={bySetPos ?? 1}
                    onChange={handleSetPosChange}
                    className="w-full max-w-[6rem] rounded border border-outline-variant bg-surface px-2 py-1 text-sm text-on-surface focus:border-sage focus:ring-sage"
                    aria-label="Week of month"
                  >
                    {SET_POS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {DAY_CODES.map((code, i) => {
                      const isSelected = byDay === code || (Array.isArray(byDay) && byDay[0] === code)
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => emitPattern({ byDay: code, interval })}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-colors ${
                            isSelected
                              ? 'border-sage bg-sage font-bold text-white'
                              : 'border-outline-variant hover:bg-sage/10'
                          }`}
                          aria-label={DAY_LABELS[i]}
                        >
                          {DAY_LABELS[i]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Yearly: month + day */}
          {freqValue === 'year' && (
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <select
                value={byMonth ?? 1}
                onChange={handleMonthChange}
                className="min-w-0 max-w-[5rem] flex-1 rounded border border-outline-variant bg-surface px-2 py-1 text-sm text-on-surface focus:border-sage focus:ring-sage"
                aria-label="Month"
              >
                {MONTH_NAMES_SHORT.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={31}
                value={byMonthDay ?? 1}
                onChange={handleYearDayChange}
                className="w-14 shrink-0 rounded border border-outline-variant bg-surface px-1.5 py-1 text-sm text-on-surface focus:border-sage focus:ring-sage"
                aria-label="Day of month"
              />
            </div>
          )}

          {/* Duration: reoccur forever and optional end date */}
          <div className="space-y-4 border-t border-outline-variant/30 pt-4">
            <label className="group flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={reoccurForever}
                  onChange={(e) => handleReoccurForeverChange(e.target.checked)}
                  className="peer sr-only"
                  aria-label="Reoccur forever"
                />
                <div className="h-5 w-5 rounded border-2 border-outline-variant transition-all group-hover:border-sage peer-checked:border-sage peer-checked:bg-sage" />
                <MaterialIcon
                  name="check"
                  className="absolute inset-0 flex items-center justify-center text-sm text-white opacity-0 peer-checked:opacity-100"
                />
              </div>
              <span className="text-sm font-medium text-on-surface">Reoccur forever</span>
            </label>
            <div className={`flex min-w-0 flex-wrap items-center gap-2 sm:gap-4 ${reoccurForever ? 'opacity-50' : ''}`}>
              <span className="shrink-0 text-sm font-medium text-on-surface">Ends on</span>
              <label className="relative flex min-w-0 cursor-pointer items-center gap-2 rounded border border-outline-variant bg-surface px-2.5 py-1.5 sm:px-3 sm:py-2">
                <span className="text-sm text-on-surface-variant">
                  {formatEndsOnDisplay(endsOnDisplay)}
                </span>
                <MaterialIcon name="calendar_today" className="text-[18px] text-outline" />
                <input
                  type="date"
                  value={endsOnDate}
                  onChange={handleEndsOnDateChange}
                  disabled={reoccurForever}
                  className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  aria-label="End date"
                />
              </label>
            </div>
          </div>

          {/* Reopen checklist items (only when task has checklists) */}
          {hasChecklists && (
            <label className="group flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={reopenChecklist}
                  onChange={handleReopenChecklistChange}
                  className="peer sr-only"
                  aria-label="Reopen checklist items when task reoccurs"
                />
                <div className="h-5 w-5 rounded border-2 border-outline-variant transition-all group-hover:border-sage peer-checked:border-sage peer-checked:bg-sage" />
                <MaterialIcon
                  name="check"
                  className="absolute inset-0 flex items-center justify-center text-sm text-white opacity-0 peer-checked:opacity-100"
                />
              </div>
              <span className="text-sm font-medium text-on-surface">Reopen checklist items</span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
