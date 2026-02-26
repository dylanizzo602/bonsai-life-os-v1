/* HabitTableV1: Habits 1.1 view. Green / yellow / red cells; weighted streak (green=1, yellow=0.1, red=0). */

import type React from 'react'
import { useCallback } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'
import { isSelectedWeekday } from '../../lib/streaks'
import type { HabitWithStreaksV1, HabitEntry } from './types'

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

/** Short month + day for date column header */
function formatHeaderMonthDay(ymd: string): { month: string; day: string } {
  const d = new Date(ymd + 'T12:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = String(d.getDate())
  return { month, day }
}

export interface HabitTableV1Props {
  habits: HabitWithStreaksV1[]
  entriesByHabit: Record<string, HabitEntry[]>
  dateRange: { start: string; end: string }
  todayYMD: string
  onCycleEntryV1: (habitId: string, date: string) => Promise<void>
  onEditHabit: (habit: HabitWithStreaksV1) => void
  isDesktop?: boolean
  dateRangeText?: string
  onPrevRange?: () => void
  onNextRange?: () => void
}

const DATE_COLUMN_WIDTH_PX = 44
const HABIT_COLUMN_WIDTH_PX = 140
const STREAK_COLUMN_WIDTH_PX = 100

/**
 * 1.1 table: Green (completed), yellow (minimum), red (skipped/no entry). Weighted streak column.
 */
export function HabitTableV1({
  habits,
  entriesByHabit,
  dateRange,
  todayYMD,
  onCycleEntryV1,
  onEditHabit,
  isDesktop = false,
  dateRangeText,
  onPrevRange,
  onNextRange,
}: HabitTableV1Props) {
  const dates = datesInRange(dateRange.start, dateRange.end)
  const tableWidthPx =
    HABIT_COLUMN_WIDTH_PX + dates.length * DATE_COLUMN_WIDTH_PX + STREAK_COLUMN_WIDTH_PX

  const getEntry = useCallback(
    (habitId: string, date: string): 'completed' | 'skipped' | 'minimum' | null => {
      const entries = entriesByHabit[habitId] ?? []
      const e = entries.find((x) => x.entry_date === date)
      return e ? e.status : null
    },
    [entriesByHabit]
  )

  const handleCellClick = useCallback(
    (habitId: string, date: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      onCycleEntryV1(habitId, date)
    },
    [onCycleEntryV1]
  )

  const squareCellStyle = {
    width: DATE_COLUMN_WIDTH_PX,
    minWidth: DATE_COLUMN_WIDTH_PX,
    height: DATE_COLUMN_WIDTH_PX,
    padding: 0 as const,
  }

  /* Cell background by status: green, yellow, red */
  const getCellBg = (status: 'completed' | 'skipped' | 'minimum' | null): string => {
    if (status === 'completed') return 'bg-green-500'
    if (status === 'minimum') return 'bg-amber-400'
    return 'bg-red-400'
  }

  if (isDesktop) {
    return (
      <div className="w-fit border border-bonsai-slate-200 rounded-lg overflow-hidden bg-white">
        {dateRangeText && onPrevRange && onNextRange && (
          <div className="flex items-center justify-center gap-2 py-2 border-b border-bonsai-slate-200 bg-bonsai-slate-50">
            <button
              type="button"
              onClick={onPrevRange}
              className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-body font-medium text-bonsai-slate-700 min-w-[180px] text-center">
              {dateRangeText}
            </span>
            <button
              type="button"
              onClick={onNextRange}
              className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded"
              aria-label="Next week"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <table className="border-collapse" style={{ tableLayout: 'fixed', width: tableWidthPx }}>
          <thead>
            <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50">
              <th
                className="text-left text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 border-r border-bonsai-slate-200"
                style={{ width: HABIT_COLUMN_WIDTH_PX }}
              >
                HABIT
              </th>
              {dates.map((d) => {
                const isToday = d === todayYMD
                const { month, day } = formatHeaderMonthDay(d)
                return (
                  <th
                    key={d}
                    className={`text-center font-semibold py-0.5 px-0.5 text-xs ${isToday ? 'bg-bonsai-sage-100 text-bonsai-sage-700' : 'bg-bonsai-slate-50'} text-bonsai-slate-700`}
                    style={{ ...squareCellStyle }}
                  >
                    <span className="block leading-none text-[10px]">{month}</span>
                    <span className="block font-semibold leading-tight mt-0.5">{day}</span>
                  </th>
                )
              })}
              <th
                className="text-center text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 border-l border-bonsai-slate-200"
                style={{ width: STREAK_COLUMN_WIDTH_PX }}
              >
                STREAK
              </th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <tr key={habit.id} className="group border-b border-bonsai-slate-100 hover:bg-bonsai-slate-50/50">
                <td className="py-2 px-3 border-r border-bonsai-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onEditHabit(habit)}
                    className="text-sm font-bold text-bonsai-brown-700 hover:text-bonsai-brown-800 text-left truncate max-w-full block w-full"
                  >
                    {habit.name}
                  </button>
                </td>
                {dates.map((date) => {
                  const isWeekly =
                    habit.frequency === 'weekly' &&
                    typeof habit.frequency_target === 'number' &&
                    habit.frequency_target >= 1 &&
                    habit.frequency_target <= 127
                  const isSelectedDay =
                    !isWeekly || isSelectedWeekday(date, habit.frequency_target ?? 0)
                  const status = getEntry(habit.id, date)
                  const isToday = date === todayYMD
                  const cellStatus = !isSelectedDay ? null : status
                  const bg = !isSelectedDay ? 'bg-bonsai-slate-100' : getCellBg(cellStatus)
                  return (
                    <td
                      key={date}
                      className={`p-0 relative overflow-hidden ${isToday ? 'ring-1 ring-bonsai-sage-300' : ''} ${!isSelectedDay ? 'bg-bonsai-slate-100' : ''}`}
                      style={{ ...squareCellStyle, verticalAlign: 'top' }}
                      role="gridcell"
                      aria-label={`${date}: ${cellStatus ?? 'open'}`}
                    >
                      {isSelectedDay && (
                        <button
                          type="button"
                          onClick={(e) => handleCellClick(habit.id, date, e)}
                          className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 block z-20"
                          aria-label="Cycle status"
                        />
                      )}
                      <div
                        className={`absolute inset-0 ${isSelectedDay ? bg : 'bg-bonsai-slate-100'}`}
                        style={{ width: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }}
                      />
                    </td>
                  )
                })}
                <td className="py-2 px-3 text-center border-l border-bonsai-slate-200 bg-white align-middle">
                  <div className="flex flex-col items-center gap-0 leading-tight">
                    <span className="text-xs font-medium text-bonsai-slate-600 whitespace-nowrap" role="img" aria-label="streak">
                      🔥 {habit.currentStreak % 1 === 0 ? habit.currentStreak : habit.currentStreak.toFixed(1)}
                      {habit.frequency === 'weekly' && <span className="font-normal"> wk</span>}
                    </span>
                    <span className="text-[10px] text-bonsai-slate-500 whitespace-nowrap" title={`Longest: ${habit.longestStreak}`}>
                      max {habit.longestStreak % 1 === 0 ? habit.longestStreak : habit.longestStreak.toFixed(1)}
                      {habit.frequency === 'weekly' && ' wk'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  /* Mobile: horizontal scroll, same structure */
  return (
    <div className="w-full overflow-x-auto px-4 md:px-6 flex justify-center">
      <div className="w-fit border border-bonsai-slate-200 rounded-lg overflow-hidden bg-white">
        {dateRangeText && onPrevRange && onNextRange && (
          <div className="flex items-center justify-center gap-2 py-2 border-b border-bonsai-slate-200 bg-bonsai-slate-50">
            <button type="button" onClick={onPrevRange} className="p-1.5 text-bonsai-slate-600 rounded" aria-label="Previous">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-body font-medium text-bonsai-slate-700 min-w-[140px] text-center">{dateRangeText}</span>
            <button type="button" onClick={onNextRange} className="p-1.5 text-bonsai-slate-600 rounded" aria-label="Next">
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <table className="border-collapse" style={{ tableLayout: 'fixed', width: tableWidthPx }}>
          <thead>
            <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50">
              <th className="text-left text-secondary font-semibold py-2 px-3 border-r border-bonsai-slate-200" style={{ width: HABIT_COLUMN_WIDTH_PX }}>HABIT</th>
              {dates.map((d) => (
                <th key={d} className="text-center text-xs font-semibold py-0.5 px-0.5 text-bonsai-slate-700" style={{ ...squareCellStyle }}>{formatHeaderMonthDay(d).day}</th>
              ))}
              <th className="text-center text-secondary font-semibold py-2 px-3 border-l border-bonsai-slate-200" style={{ width: STREAK_COLUMN_WIDTH_PX }}>STREAK</th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <tr key={habit.id} className="group border-b border-bonsai-slate-100" style={{ height: DATE_COLUMN_WIDTH_PX }}>
                <td className="py-2 px-3 border-r border-bonsai-slate-200 bg-white">
                  <button type="button" onClick={() => onEditHabit(habit)} className="text-sm font-bold text-bonsai-brown-700 truncate max-w-full block w-full text-left">{habit.name}</button>
                </td>
                {dates.map((date) => {
                  const isWeekly = habit.frequency === 'weekly' && typeof habit.frequency_target === 'number' && habit.frequency_target >= 1 && habit.frequency_target <= 127
                  const isSelectedDay = !isWeekly || isSelectedWeekday(date, habit.frequency_target ?? 0)
                  const status = getEntry(habit.id, date)
                  const cellStatus = !isSelectedDay ? null : status
                  const bg = !isSelectedDay ? 'bg-bonsai-slate-100' : getCellBg(cellStatus)
                  return (
                    <td key={date} className="p-0 relative overflow-hidden" style={{ ...squareCellStyle }} role="gridcell" aria-label={`${date}: ${cellStatus ?? 'open'}`}>
                      {isSelectedDay && <button type="button" onClick={(e) => handleCellClick(habit.id, date, e)} className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 block z-20" aria-label="Cycle status" />}
                      <div className={`absolute inset-0 ${bg}`} />
                    </td>
                  )
                })}
                <td className="py-1 px-2 text-center border-l border-bonsai-slate-200 bg-white align-middle" style={{ width: STREAK_COLUMN_WIDTH_PX }}>
                  <span className="text-xs font-medium text-bonsai-slate-600">🔥 {habit.currentStreak % 1 === 0 ? habit.currentStreak : habit.currentStreak.toFixed(1)}{habit.frequency === 'weekly' && ' wk'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
