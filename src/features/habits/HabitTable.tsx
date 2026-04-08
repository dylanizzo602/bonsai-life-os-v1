/* HabitTable: Calendar grid — green (target done), yellow (minimum), red (skipped / none). Integer streak column. */

import type React from 'react'
import { useCallback } from 'react'
import { isSelectedWeekday } from '../../lib/streaks'
import type { HabitWithStreaks, HabitEntry } from './types'
import { DateRangeBar } from './DateRangeBar'
import { datesInRange, formatHeaderMonthDay } from './dateUtils'
import { DATE_COLUMN_WIDTH_PX, HABIT_COLUMN_WIDTH_PX, STREAK_COLUMN_WIDTH_PX } from './constants'
import { HabitStreakSummary } from './HabitStreakSummary'

export interface HabitTableProps {
  habits: HabitWithStreaks[]
  entriesByHabit: Record<string, HabitEntry[]>
  dateRange: { start: string; end: string }
  todayYMD: string
  onCycleEntry: (habitId: string, date: string) => Promise<void>
  onEditHabit: (habit: HabitWithStreaks) => void
  isDesktop?: boolean
  dateRangeText?: string
  onPrevRange?: () => void
  onNextRange?: () => void
}

/**
 * Habits table: target / minimum / none cells; streak = consecutive days or complete weeks.
 */
export function HabitTable({
  habits,
  entriesByHabit,
  dateRange,
  todayYMD,
  onCycleEntry,
  onEditHabit,
  isDesktop = false,
  dateRangeText,
  onPrevRange,
  onNextRange,
}: HabitTableProps) {
  const dates = datesInRange(dateRange.start, dateRange.end)
  const tableWidthPx =
    HABIT_COLUMN_WIDTH_PX + dates.length * DATE_COLUMN_WIDTH_PX + STREAK_COLUMN_WIDTH_PX

  const getEntry = useCallback(
    (habitId: string, date: string): 'completed' | 'skipped' | 'minimum' | null => {
      const entries = entriesByHabit[habitId] ?? []
      const e = entries.find((x) => x.entry_date === date)
      return e ? e.status : null
    },
    [entriesByHabit],
  )

  const handleCellClick = useCallback(
    (habitId: string, date: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      onCycleEntry(habitId, date)
    },
    [onCycleEntry],
  )

  const squareCellStyle = {
    width: DATE_COLUMN_WIDTH_PX,
    minWidth: DATE_COLUMN_WIDTH_PX,
    height: DATE_COLUMN_WIDTH_PX,
    padding: 0 as const,
  }

  /* Cell background by status: green = target, yellow = minimum, red = skipped or missing on selected day */
  const getCellBg = (status: 'completed' | 'skipped' | 'minimum' | null): string => {
    if (status === 'completed') return 'bg-green-500'
    if (status === 'minimum') return 'bg-amber-400'
    return 'bg-red-400'
  }

  if (isDesktop) {
    return (
      <div className="w-fit border border-bonsai-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {dateRangeText && onPrevRange && onNextRange && (
          <DateRangeBar dateRangeText={dateRangeText} onPrev={onPrevRange} onNext={onNextRange} />
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 py-1.5 px-2 border-b border-bonsai-slate-200 bg-bonsai-slate-50/70">
          <span className="text-secondary text-bonsai-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-500 align-middle mr-1" aria-hidden />
            Target
          </span>
          <span className="text-secondary text-bonsai-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 align-middle mr-1" aria-hidden />
            Minimum
          </span>
          <span className="text-secondary text-bonsai-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-400 align-middle mr-1" aria-hidden />
            None
          </span>
        </div>
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
            {habits.map((habit) => {
              return (
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
                            className="absolute top-0 left-0 z-20 cursor-pointer border-0 p-0 block"
                            style={{ width: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }}
                            aria-label="Cycle status"
                          />
                        )}
                        <div
                          className={`absolute top-0 left-0 ${isSelectedDay ? bg : 'bg-bonsai-slate-100'}`}
                          style={{ width: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }}
                        />
                      </td>
                    )
                  })}
                  <td className="py-2 px-2 text-left border-l border-bonsai-slate-200 bg-white align-top">
                    <HabitStreakSummary habit={habit} showLongest variant="compact" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const rightPanelWidthPx = dates.length * DATE_COLUMN_WIDTH_PX + STREAK_COLUMN_WIDTH_PX
  return (
    <div className="w-fit border border-bonsai-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {dateRangeText && onPrevRange && onNextRange && (
        <DateRangeBar dateRangeText={dateRangeText} onPrev={onPrevRange} onNext={onNextRange} />
      )}
      <div className="flex items-stretch">
        <div className="shrink-0 border-r border-bonsai-slate-200 bg-bonsai-slate-50/50 z-10 flex flex-col" style={{ width: HABIT_COLUMN_WIDTH_PX }}>
          <div className="bg-bonsai-slate-50 border-b border-bonsai-slate-200 py-2 px-3 flex items-center shrink-0" style={{ height: DATE_COLUMN_WIDTH_PX }}>
            <span className="text-secondary font-semibold text-bonsai-slate-700">HABIT</span>
          </div>
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="border-b border-bonsai-slate-100 py-2 px-3 bg-white hover:bg-bonsai-slate-50/50 flex items-start shrink-0 min-h-[5.5rem]"
            >
              <button type="button" onClick={() => onEditHabit(habit)} className="text-sm font-bold text-bonsai-brown-700 hover:text-bonsai-brown-800 text-left truncate max-w-full block w-full">
                {habit.name}
              </button>
            </div>
          ))}
        </div>
        <div style={{ width: rightPanelWidthPx }}>
          <table className="border-collapse" style={{ tableLayout: 'fixed', width: rightPanelWidthPx }}>
            <thead>
              <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50" style={{ height: DATE_COLUMN_WIDTH_PX }}>
                {dates.map((d) => {
                  const isToday = d === todayYMD
                  const { month, day } = formatHeaderMonthDay(d)
                  return (
                    <th key={d} className={`text-center font-semibold py-0.5 px-0.5 text-xs text-bonsai-slate-700 overflow-hidden ${isToday ? 'bg-bonsai-sage-100 text-bonsai-sage-700' : 'bg-bonsai-slate-50'}`} style={{ ...squareCellStyle }} title={d}>
                      <span className="block leading-none text-[10px]">{month}</span>
                      <span className="block font-semibold leading-tight mt-0.5">{day}</span>
                    </th>
                  )
                })}
                <th className="text-center text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 border-l border-bonsai-slate-200 bg-bonsai-slate-50" style={{ width: STREAK_COLUMN_WIDTH_PX, minWidth: STREAK_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }}>
                  STREAK
                </th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                return (
                  <tr key={habit.id} className="group border-b border-bonsai-slate-100 hover:bg-bonsai-slate-50/50 min-h-[5.5rem]">
                    {dates.map((date) => {
                      const isWeekly = habit.frequency === 'weekly' && typeof habit.frequency_target === 'number' && habit.frequency_target >= 1 && habit.frequency_target <= 127
                      const isSelectedDay = !isWeekly || isSelectedWeekday(date, habit.frequency_target ?? 0)
                      const status = getEntry(habit.id, date)
                      const cellStatus = !isSelectedDay ? null : status
                      const bg = !isSelectedDay ? 'bg-bonsai-slate-100' : getCellBg(cellStatus)
                      const isToday = date === todayYMD
                      return (
                        <td key={date} className={`p-0 relative overflow-hidden ${isToday ? 'ring-1 ring-bonsai-sage-300' : ''}`} style={{ ...squareCellStyle, verticalAlign: 'top' }} role="gridcell" aria-label={`${date}: ${cellStatus ?? 'open'}`}>
                          {isSelectedDay && (
                            <button
                              type="button"
                              onClick={(e) => handleCellClick(habit.id, date, e)}
                              className="absolute top-0 left-0 z-20 cursor-pointer border-0 p-0 block touch-manipulation"
                              style={{ width: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }}
                              aria-label="Cycle status"
                            />
                          )}
                          <div className={`absolute top-0 left-0 ${bg}`} style={{ width: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }} />
                        </td>
                      )
                    })}
                    <td className="py-1 px-1.5 text-left border-l border-bonsai-slate-200 bg-white align-top" style={{ width: STREAK_COLUMN_WIDTH_PX, minWidth: STREAK_COLUMN_WIDTH_PX }}>
                      <HabitStreakSummary habit={habit} showLongest variant="compact" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
