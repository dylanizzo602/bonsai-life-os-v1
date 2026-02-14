/* RecurringSettingsSection: Inline recurring settings for date picker (replaces suggested dates) */

import { useEffect, useCallback } from 'react'
import { Checkbox } from '../../../components/Checkbox'
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

  /* Sync from value when it changes externally (e.g. opening modal with existing recurrence) */
  useEffect(() => {
    if (value && value.freq !== freqValue) {
      /* Value changed externally; component will re-render with new value */
    }
  }, [value, freqValue])

  /* Frequency dropdown change */
  const handleFreqChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === 'none') {
      onChange(null)
      return
    }
    emitPattern({ freq: v as RecurrenceFreq })
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

  const handleEndsOnChange = (checked: boolean) => {
    if (checked) {
      const d = anchorDueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
      emitPattern({ until: d })
    } else {
      emitPattern({ until: null })
    }
  }

  const handleEndsOnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value || null
    emitPattern({ until: d })
  }

  const handleReopenChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emitPattern({ reopenChecklist: e.target.checked })
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Heading */}
      <h3 className="text-body font-bold text-bonsai-brown-700 shrink-0">Reoccurring</h3>

      {/* Frequency: Every N + unit dropdown (one row, no wrap) */}
      <div className="flex items-center gap-2 shrink-0">
        {freqValue !== 'none' && (
          <>
            <span className="text-secondary text-bonsai-slate-700 whitespace-nowrap">Every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={handleIntervalChange}
              className="w-11 rounded border border-bonsai-slate-300 px-1.5 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 shrink-0"
              aria-label="Recurrence interval"
            />
          </>
        )}
        <select
          value={freqValue}
          onChange={handleFreqChange}
          className="rounded border border-bonsai-slate-300 px-2 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 bg-white min-w-0 flex-1 max-w-[6rem]"
          aria-label="Recurrence frequency"
        >
          <option value="none">none</option>
          <option value="day">day</option>
          <option value="week">week</option>
          <option value="month">month</option>
          <option value="year">year</option>
        </select>
      </div>

      {/* Frequency-specific UI (hidden when none) */}
      {freqValue !== 'none' && (
        <div className="flex flex-col gap-3 min-w-0">
          {/* Weekly: day buttons in a single wrapped row */}
          {freqValue === 'week' && (
            <div className="flex flex-wrap gap-1">
              {DAY_CODES.map((code, i) => {
                const isSelected = Array.isArray(byDay) ? byDay.includes(code) : byDay === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleDay(code)}
                    className={`w-7 h-7 rounded text-secondary text-xs font-medium shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700'
                        : 'bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200'
                    }`}
                    aria-label={`${DAY_LABELS[i]} ${isSelected ? 'selected' : 'not selected'}`}
                  >
                    {DAY_LABELS[i]}
                  </button>
                )
              })}
            </div>
          )}

          {/* Monthly: on date vs by week - stacked rows */}
          {freqValue === 'month' && (
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="monthly-variant"
                    checked={monthlyVariant === 'on_date'}
                    onChange={() => handleMonthlyVariantChange('on_date')}
                    className="text-bonsai-sage-600 focus:ring-bonsai-sage-500"
                  />
                  <span className="text-secondary text-bonsai-slate-700">on date</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="monthly-variant"
                    checked={monthlyVariant === 'by_week'}
                    onChange={() => handleMonthlyVariantChange('by_week')}
                    className="text-bonsai-sage-600 focus:ring-bonsai-sage-500"
                  />
                  <span className="text-secondary text-bonsai-slate-700">by week</span>
                </label>
              </div>
              {monthlyVariant === 'on_date' && (
                <select
                  value={byMonthDay === -1 ? 'last' : String(byMonthDay ?? 1)}
                  onChange={handleMonthDayChange}
                  className="rounded border border-bonsai-slate-300 px-2 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 bg-white w-full max-w-[8rem]"
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
                    className="rounded border border-bonsai-slate-300 px-2 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 bg-white w-full max-w-[6rem]"
                    aria-label="Week of month"
                  >
                    {SET_POS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1">
                    {DAY_CODES.map((code, i) => {
                      const isSelected = byDay === code || (Array.isArray(byDay) && byDay[0] === code)
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => emitPattern({ byDay: code, interval })}
                          className={`w-7 h-7 rounded text-secondary text-xs font-medium shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700'
                              : 'bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200'
                          }`}
                          aria-label={`${DAY_LABELS[i]}`}
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

          {/* Yearly: month + day - compact row */}
          {freqValue === 'year' && (
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <select
                value={byMonth ?? 1}
                onChange={handleMonthChange}
                className="rounded border border-bonsai-slate-300 px-2 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 bg-white min-w-0 flex-1 max-w-[5rem]"
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
                className="w-10 rounded border border-bonsai-slate-300 px-1.5 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 shrink-0"
                aria-label="Day of month"
              />
            </div>
          )}

          {/* Duration: Reoccur forever or Ends on - stacked */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <Checkbox
                checked={reoccurForever}
                onChange={(e) => handleReoccurForeverChange(e.target.checked)}
                aria-label="Reoccur forever"
              />
              <span className="text-secondary text-bonsai-slate-700">Reoccur forever</span>
            </label>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <Checkbox
                  checked={!reoccurForever}
                  onChange={(e) => handleEndsOnChange(e.target.checked)}
                  aria-label="Ends on date"
                />
                <span className="text-secondary text-bonsai-slate-700">Ends on</span>
              </label>
              <input
                type="date"
                value={endsOnDate}
                onChange={handleEndsOnDateChange}
                disabled={reoccurForever}
                className="rounded border border-bonsai-slate-300 px-2 py-1 text-secondary text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 disabled:opacity-50 disabled:cursor-not-allowed w-full min-w-0"
                aria-label="End date"
              />
            </div>
          </div>

          {/* Reopen checklist items (only when task has checklists) */}
          {hasChecklists && (
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <Checkbox
                checked={reopenChecklist}
                onChange={handleReopenChecklistChange}
                aria-label="Reopen checklist items when task reoccurs"
              />
              <span className="text-secondary text-bonsai-slate-700">Reopen checklist items</span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
