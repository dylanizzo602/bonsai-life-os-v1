/* HabitFrequencySelector: Segmented Daily/Weekly/Monthly + weekday circles for weekly */

import type { HabitFrequency } from '../types'

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

/** Mon-first day labels matching mock (stored as Sun=0 … Sat=6 bitmask) */
const WEEKDAY_CIRCLES: { bit: number; label: string }[] = [
  { bit: 1, label: 'M' },
  { bit: 2, label: 'T' },
  { bit: 3, label: 'W' },
  { bit: 4, label: 'T' },
  { bit: 5, label: 'F' },
  { bit: 6, label: 'S' },
  { bit: 0, label: 'S' },
]

const DAYS_OF_MONTH: { value: number; label: string }[] = [
  { value: -1, label: 'Last day' },
  ...Array.from({ length: 31 }, (_, i) => {
    const d = i + 1
    const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'
    return { value: d, label: `${d}${suffix}` }
  }),
]

export interface HabitFrequencySelectorProps {
  frequency: HabitFrequency
  frequencyTarget: number
  monthlyInterval: number
  monthlyDay: number
  onFrequencyChange: (freq: HabitFrequency) => void
  onFrequencyTargetChange: (mask: number) => void
  onMonthlyIntervalChange: (interval: number) => void
  onMonthlyDayChange: (day: number) => void
}

/**
 * Frequency controls: segmented tabs plus weekly day circles or monthly pickers.
 */
export function HabitFrequencySelector({
  frequency,
  frequencyTarget,
  monthlyInterval,
  monthlyDay,
  onFrequencyChange,
  onFrequencyTargetChange,
  onMonthlyIntervalChange,
  onMonthlyDayChange,
}: HabitFrequencySelectorProps) {
  const weeklyMask =
    typeof frequencyTarget === 'number' && frequencyTarget >= 1 && frequencyTarget <= 127
      ? frequencyTarget
      : 62 /* Mon–Fri default */

  return (
    <section className="space-y-6">
      <label className="block text-secondary font-bold uppercase tracking-widest text-outline">
        Frequency
      </label>

      {/* Segmented control */}
      <div className="flex w-full max-w-sm rounded-lg bg-surface-container p-1.5">
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onFrequencyChange(opt.value)}
            className={`flex-1 rounded-md py-2.5 text-secondary font-semibold transition-colors ${
              frequency === opt.value
                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Weekly: circular day toggles */}
      {frequency === 'weekly' && (
        <div className="flex max-w-md justify-between pt-2">
          {WEEKDAY_CIRCLES.map(({ bit, label }) => {
            const selected = (weeklyMask & (1 << bit)) !== 0
            return (
              <button
                key={bit}
                type="button"
                onClick={() => {
                  const newMask = weeklyMask ^ (1 << bit)
                  onFrequencyTargetChange(newMask === 0 ? weeklyMask : newMask)
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold transition-all ${
                  selected
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-outline-variant text-secondary text-outline hover:border-primary hover:text-primary'
                }`}
                aria-label={`Toggle ${label}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Monthly: interval + day-of-month */}
      {frequency === 'monthly' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-secondary text-on-surface-variant">Every</label>
            <input
              type="number"
              min={1}
              max={12}
              value={monthlyInterval}
              onChange={(e) =>
                onMonthlyIntervalChange(Math.max(1, Math.min(12, Math.trunc(Number(e.target.value) || 1))))
              }
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-secondary text-on-surface-variant">On</label>
            <select
              value={monthlyDay}
              onChange={(e) => {
                const raw = Math.trunc(Number(e.target.value))
                onMonthlyDayChange(raw === -1 ? -1 : Math.max(1, Math.min(31, raw)))
              }}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {DAYS_OF_MONTH.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  )
}
