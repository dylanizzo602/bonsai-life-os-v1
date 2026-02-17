/* HabitTable: Calendar grid with habit names, date cells (complete/skip/open), and streak column */

import type React from 'react'
import { useCallback } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'
import type { HabitWithStreaks, HabitEntry, HabitColorId } from './types'

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** List of dates from start to end inclusive */
function datesInRange(start: string, end: string): string[] {
  const out: string[] = []
  let d = start
  while (d <= end) {
    out.push(d)
    d = addDays(d, 1)
  }
  return out
}

/** Format date for column header: "SUN 8" */
function formatHeader(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const dayName = dayNames[d.getDay()]
  const dateNum = d.getDate()
  return `${dayName} ${dateNum}`
}

/** Gradient: 16 steps from light to dark; stays light longer then darkens slowly (Tailwind classes) */
const SHADE_STEPS: Record<HabitColorId, string[]> = {
  orange: ['bg-orange-300', 'bg-orange-300', 'bg-orange-300', 'bg-orange-400', 'bg-orange-400', 'bg-orange-400', 'bg-orange-500', 'bg-orange-500', 'bg-orange-600', 'bg-orange-600', 'bg-orange-700', 'bg-orange-700', 'bg-orange-800', 'bg-orange-900', 'bg-orange-950', 'bg-orange-950'],
  yellow: ['bg-yellow-300', 'bg-yellow-300', 'bg-yellow-300', 'bg-yellow-400', 'bg-yellow-400', 'bg-yellow-500', 'bg-yellow-500', 'bg-amber-600', 'bg-amber-600', 'bg-amber-700', 'bg-amber-700', 'bg-amber-800', 'bg-amber-800', 'bg-amber-900', 'bg-amber-950', 'bg-amber-950'],
  green: ['bg-green-300', 'bg-green-300', 'bg-green-300', 'bg-green-400', 'bg-green-400', 'bg-green-400', 'bg-green-500', 'bg-green-500', 'bg-green-600', 'bg-green-600', 'bg-green-700', 'bg-green-700', 'bg-green-800', 'bg-green-900', 'bg-green-950', 'bg-green-950'],
  light_blue: ['bg-blue-300', 'bg-blue-300', 'bg-blue-300', 'bg-blue-400', 'bg-blue-400', 'bg-blue-400', 'bg-blue-500', 'bg-blue-500', 'bg-blue-600', 'bg-blue-600', 'bg-blue-700', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900', 'bg-blue-950', 'bg-blue-950'],
  dark_blue: ['bg-blue-400', 'bg-blue-400', 'bg-blue-400', 'bg-blue-500', 'bg-blue-500', 'bg-blue-500', 'bg-blue-600', 'bg-blue-600', 'bg-blue-700', 'bg-blue-700', 'bg-blue-800', 'bg-blue-800', 'bg-blue-900', 'bg-blue-900', 'bg-blue-950', 'bg-blue-950'],
  purple: ['bg-purple-300', 'bg-purple-300', 'bg-purple-300', 'bg-purple-400', 'bg-purple-400', 'bg-purple-400', 'bg-purple-500', 'bg-purple-500', 'bg-purple-600', 'bg-purple-600', 'bg-purple-700', 'bg-purple-700', 'bg-purple-800', 'bg-purple-900', 'bg-purple-950', 'bg-purple-950'],
  pink: ['bg-pink-300', 'bg-pink-300', 'bg-pink-300', 'bg-pink-400', 'bg-pink-400', 'bg-pink-400', 'bg-pink-500', 'bg-pink-500', 'bg-pink-600', 'bg-pink-600', 'bg-pink-700', 'bg-pink-700', 'bg-pink-800', 'bg-pink-900', 'bg-pink-950', 'bg-pink-950'],
  red: ['bg-red-400', 'bg-red-400', 'bg-red-400', 'bg-red-500', 'bg-red-500', 'bg-red-500', 'bg-red-600', 'bg-red-600', 'bg-red-700', 'bg-red-700', 'bg-red-800', 'bg-red-800', 'bg-red-900', 'bg-red-900', 'bg-red-950', 'bg-red-950'],
  grey: ['bg-bonsai-slate-300', 'bg-bonsai-slate-300', 'bg-bonsai-slate-300', 'bg-bonsai-slate-400', 'bg-bonsai-slate-400', 'bg-bonsai-slate-400', 'bg-bonsai-slate-500', 'bg-bonsai-slate-500', 'bg-bonsai-slate-600', 'bg-bonsai-slate-600', 'bg-bonsai-slate-700', 'bg-bonsai-slate-700', 'bg-bonsai-slate-800', 'bg-bonsai-slate-900', 'bg-bonsai-slate-950', 'bg-bonsai-slate-950'],
}

function getShadeClass(color: HabitColorId, index: number): string {
  const steps = SHADE_STEPS[color]
  const i = Math.min(index, steps.length - 1)
  return steps[i]
}

export interface HabitTableProps {
  habits: HabitWithStreaks[]
  entriesByHabit: Record<string, HabitEntry[]>
  dateRange: { start: string; end: string }
  todayYMD: string
  onCycleEntry: (habitId: string, date: string) => Promise<void>
  onEditHabit: (habit: HabitWithStreaks) => void
  isDesktop?: boolean
  onPrevWeek?: () => void
  onNextWeek?: () => void
  dateRangeText?: string
}

/**
 * Table: HABIT | date columns | STREAK. Cells cycle complete -> skip -> open. Streak column shows flame + current, longest below.
 */
export function HabitTable({
  habits,
  entriesByHabit,
  dateRange,
  todayYMD,
  onCycleEntry,
  onEditHabit,
  isDesktop = false,
  onPrevWeek,
  onNextWeek,
  dateRangeText,
}: HabitTableProps) {
  const dates = datesInRange(dateRange.start, dateRange.end)

  const getEntry = (habitId: string, date: string): 'completed' | 'skipped' | null => {
    const entries = entriesByHabit[habitId] ?? []
    const e = entries.find((x) => x.entry_date === date)
    return e ? e.status : null
  }

  const handleCellClick = useCallback(
    (habitId: string, date: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      onCycleEntry(habitId, date)
    },
    [onCycleEntry]
  )

  return (
    <div className="rounded-lg border border-bonsai-slate-200 overflow-hidden bg-white">
      {/* Date range selector: desktop only, centered above table */}
      {isDesktop && dateRangeText && (
        <div className="flex items-center justify-center gap-2 py-3 border-b border-bonsai-slate-200 bg-bonsai-slate-50">
          {onPrevWeek && (
            <button
              type="button"
              onClick={onPrevWeek}
              className="p-1 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
          <span className="text-body font-medium text-bonsai-slate-600 min-w-[180px] text-center">
            {dateRangeText}
          </span>
          {onNextWeek && (
            <button
              type="button"
              onClick={onNextWeek}
              className="p-1 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded"
              aria-label="Next week"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50">
            <th className="text-left text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 md:py-3 md:px-4" style={{ width: '200px' }}>
              HABIT
            </th>
            {dates.map((d) => {
              const isToday = d === todayYMD
              return (
                <th
                  key={d}
                  className={`text-center text-secondary font-semibold py-2 px-2 md:py-3 md:px-3 ${
                    isToday
                      ? 'bg-bonsai-sage-100 text-bonsai-sage-700'
                      : 'text-bonsai-slate-700'
                  }`}
                >
                  {formatHeader(d)}
                </th>
              )
            })}
            <th className="text-center text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 md:py-3 md:px-4" style={{ width: '120px' }}>
              STREAK
            </th>
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => {
            const streakDates = habit.currentStreakDates
            return (
              <tr
                key={habit.id}
                className="border-b border-bonsai-slate-100 hover:bg-bonsai-slate-50/50"
              >
                <td className="py-2 px-3 md:py-3 md:px-4">
                  <button
                    type="button"
                    onClick={() => onEditHabit(habit)}
                    className="text-body font-bold text-bonsai-brown-700 hover:text-bonsai-brown-800 text-left"
                  >
                    {habit.name}
                  </button>
                </td>
                {dates.map((date) => {
                  const status = getEntry(habit.id, date)
                  const streakIndex = streakDates.indexOf(date)
                  const prevDate = addDays(date, -1)
                  const prevIndex = streakDates.indexOf(prevDate)
                  /* Shade index: skipped uses previous day's shade, completed uses streak index (or 0 if not in streak yet) */
                  const shadeIndex = status === 'skipped' ? (prevIndex >= 0 ? prevIndex : 0) : status === 'completed' ? (streakIndex >= 0 ? streakIndex : 0) : -1
                  const shadeClass = shadeIndex >= 0 ? getShadeClass(habit.color, shadeIndex) : ''
                  const isToday = date === todayYMD

                  return (
                    <td
                      key={date}
                      className={`p-0 align-top relative min-w-0 ${isToday ? 'bg-bonsai-sage-100' : ''}`}
                      role="gridcell"
                      aria-label={`${date}: ${status ?? 'open'}`}
                      data-status={status ?? 'empty'}
                    >
                      {/* Click overlay: full cell so click always registers */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCellClick(habit.id, date, e)
                        }}
                        className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 block opacity-0 z-20"
                        aria-label={`Mark ${date} as ${status === null ? 'completed' : status === 'completed' ? 'skipped' : 'open'}`}
                        title={status === null ? 'Mark complete' : status === 'completed' ? 'Mark skipped' : 'Clear'}
                      />
                      <div className="relative w-full pointer-events-none" style={{ paddingBottom: '100%' }}>
                        <div className="absolute inset-0 overflow-hidden bg-white pointer-events-none">
                          {status === null && <div className="w-full h-full bg-white" />}
                          {status === 'completed' && (
                            <>
                              <div className={`w-full h-full ${shadeClass} completed-cell`} />
                              <div className="completed-hover-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity bg-black/10 pointer-events-none z-10">
                                <span className="text-white text-xs font-medium drop-shadow">skip</span>
                              </div>
                            </>
                          )}
                          {status === 'skipped' && (
                            <>
                              <div className="absolute inset-0 bg-white" />
                              <div
                                className={`absolute inset-0 ${shadeClass}`}
                                style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  )
                })}
                <td className="py-2 px-3 md:py-3 md:px-4 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-body font-medium text-bonsai-slate-600" role="img" aria-label="streak">
                      🔥 {habit.currentStreak}
                    </span>
                    <span className="text-secondary text-bonsai-slate-500">longest {habit.longestStreak}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
