/* HabitTable: HABIT (sticky) | scrollable date columns (past through today only) | STREAK at end */

import type React from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'
import { isSelectedWeekday } from '../../lib/streaks'
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

/** Day number only (e.g. "18") */
function formatHeaderDayOnly(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  return String(d.getDate())
}

/** Short month + day for date column header (e.g. "Feb" and "18") */
function formatHeaderMonthDay(ymd: string): { month: string; day: string } {
  const d = new Date(ymd + 'T12:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = String(d.getDate())
  return { month, day }
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
  /** Desktop: week view with arrow nav; when true, dateRangeText and onPrev/Next are used for the date bar */
  isDesktop?: boolean
  /** Shown in the date bar when using week navigation (desktop) */
  dateRangeText?: string
  onPrevRange?: () => void
  onNextRange?: () => void
}

/** Fixed width for date columns so table extends and scrolls horizontally */
const DATE_COLUMN_WIDTH_PX = 44
const HABIT_COLUMN_WIDTH_PX = 140
const STREAK_COLUMN_WIDTH_PX = 100

/**
 * Table: HABIT (sticky left) | scrollable date columns | STREAK (sticky right). Full viewport width; scroll through past to tomorrow.
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  /* Mobile/tablet: scroll to the right so today (and streak) are in view when 7 dates are shown */
  useEffect(() => {
    if (isDesktop) return
    const el = scrollContainerRef.current
    if (!el) return
    const scrollToEnd = () => {
      el.scrollLeft = el.scrollWidth - el.clientWidth
    }
    scrollToEnd()
    requestAnimationFrame(scrollToEnd)
  }, [isDesktop, dates.length, dateRange.start, dateRange.end])

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

  /* Desktop: date columns share remaining width (table fills viewport); mobile: fixed width per column */
  const dateColWidthStyle = isDesktop
    ? { width: `calc((100% - ${HABIT_COLUMN_WIDTH_PX}px - ${STREAK_COLUMN_WIDTH_PX}px) / ${dates.length})` }
    : { width: DATE_COLUMN_WIDTH_PX, minWidth: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }

  /* Desktop: single table so dates fill width between HABIT and STREAK and rows stay aligned */
  if (isDesktop) {
    return (
      <div className="w-full border border-bonsai-slate-200 rounded-lg overflow-hidden bg-white min-w-0">
        {dateRangeText && onPrevRange && onNextRange && (
          <div className="flex items-center justify-center gap-2 py-2 border-b border-bonsai-slate-200 bg-bonsai-slate-50">
            <button type="button" onClick={onPrevRange} className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded" aria-label="Previous week">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-body font-medium text-bonsai-slate-700 min-w-[180px] text-center">{dateRangeText}</span>
            <button type="button" onClick={onNextRange} className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded" aria-label="Next week">
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50">
                <th className="text-left text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 border-r border-bonsai-slate-200 bg-bonsai-slate-50" style={{ width: HABIT_COLUMN_WIDTH_PX }}>HABIT</th>
                {dates.map((d) => {
                  const isToday = d === todayYMD
                  const { month, day } = formatHeaderMonthDay(d)
                  return (
                    <th key={d} className={`text-center font-semibold py-0.5 px-0.5 text-xs overflow-hidden ${isToday ? 'bg-bonsai-sage-100 text-bonsai-sage-700' : 'bg-bonsai-slate-50'} text-bonsai-slate-700`} style={{ ...dateColWidthStyle, minWidth: 0 }} title={isToday ? `Today – ${formatHeader(d)}` : formatHeader(d)}>
                      <span className="block leading-none text-[10px]">{month}</span>
                      <span className="block font-semibold leading-tight mt-0.5">
                        {isToday ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bonsai-sage-300 text-bonsai-sage-800 text-xs" aria-label="Today">{day}</span> : day}
                      </span>
                    </th>
                  )
                })}
                <th className="text-center text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 border-l border-bonsai-slate-200 bg-bonsai-slate-50" style={{ width: STREAK_COLUMN_WIDTH_PX }}>STREAK</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => (
                <tr key={habit.id} className="group border-b border-bonsai-slate-100 hover:bg-bonsai-slate-50/50">
                  <td className="py-2 px-3 border-r border-bonsai-slate-200 bg-white group-hover:bg-bonsai-slate-50/50">
                    <button type="button" onClick={() => onEditHabit(habit)} className="text-sm font-bold text-bonsai-brown-700 hover:text-bonsai-brown-800 text-left truncate max-w-full block w-full">{habit.name}</button>
                  </td>
                  {dates.map((date) => {
                    const isWeekly = habit.frequency === 'weekly' && typeof habit.frequency_target === 'number' && habit.frequency_target >= 1 && habit.frequency_target <= 127
                    const isSelectedDay = !isWeekly || isSelectedWeekday(date, habit.frequency_target ?? 0)
                    const status = getEntry(habit.id, date)
                    const streakDates = habit.currentStreakDates
                    const streakIndex = streakDates.indexOf(date)
                    const prevDate = addDays(date, -1)
                    const prevIndex = streakDates.indexOf(prevDate)
                    const shadeIndex = status === 'skipped' ? (prevIndex >= 0 ? prevIndex : 0) : status === 'completed' ? (streakIndex >= 0 ? streakIndex : 0) : -1
                    const shadeClass = shadeIndex >= 0 ? getShadeClass(habit.color, shadeIndex) : ''
                    const isToday = date === todayYMD
                    return (
                      <td key={date} className={`p-0 relative overflow-hidden align-top ${isToday ? 'bg-bonsai-sage-100' : ''} ${!isSelectedDay ? 'bg-bonsai-slate-100' : ''}`} style={{ ...dateColWidthStyle, minWidth: 0, padding: 0, verticalAlign: 'top' }} role="gridcell" aria-label={`${date}: ${!isSelectedDay ? 'not scheduled' : status ?? 'open'}`} data-status={!isSelectedDay ? 'disabled' : status ?? 'empty'}>
                        {/* Wrapper forces cell to be square (aspect-ratio 1) on desktop */}
                        <div className="relative w-full pointer-events-none" style={{ aspectRatio: '1' }}>
                          {isSelectedDay && (
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCellClick(habit.id, date, e) }} className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 block opacity-0 z-20 pointer-events-auto" aria-label={status === null ? 'Mark complete' : status === 'completed' ? 'Mark skipped' : 'Clear'} title={status === null ? 'Mark complete' : status === 'completed' ? 'Mark skipped' : 'Clear'} />
                          )}
                          <div className="absolute inset-0 pointer-events-none">
                            {!isSelectedDay && <div className="w-full h-full bg-bonsai-slate-100" />}
                            {isSelectedDay && status === null && <div className="w-full h-full bg-white" />}
                            {isSelectedDay && status === 'completed' && <><div className={`absolute inset-0 ${shadeClass} completed-cell`} /><div className="completed-hover-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity bg-black/10 pointer-events-none z-10"><span className="text-white text-xs font-medium drop-shadow">skip</span></div></>}
                            {isSelectedDay && status === 'skipped' && <><div className="absolute inset-0 bg-white" /><div className={`absolute inset-0 ${shadeClass}`} style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }} /></>}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                  <td className="py-2 px-3 text-center border-l border-bonsai-slate-200 bg-white group-hover:bg-bonsai-slate-50/50 align-middle">
                    <div className="flex flex-col items-center gap-0 leading-tight">
                      <span className="text-xs font-medium text-bonsai-slate-600 whitespace-nowrap" role="img" aria-label="streak">🔥 {habit.currentStreak}{habit.frequency === 'weekly' && <span className="font-normal"> wk</span>}</span>
                      <span className="text-[10px] text-bonsai-slate-500 whitespace-nowrap" title={`Longest streak: ${habit.longestStreak}${habit.frequency === 'weekly' ? ' wk' : ''}`}>max {habit.longestStreak}{habit.frequency === 'weekly' && ' wk'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  /* Mobile/tablet: two-panel layout; dates panel scrolls horizontally (overflow-x-auto) */
  return (
    <div className="w-full border-y border-bonsai-slate-200 bg-white min-w-0">
      {dateRangeText && onPrevRange && onNextRange && (
        <div className="flex items-center justify-center gap-2 py-2 border-b border-bonsai-slate-200 bg-bonsai-slate-50">
          <button type="button" onClick={onPrevRange} className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded touch-manipulation" aria-label="Previous week"><ChevronLeftIcon className="w-5 h-5" /></button>
          <span className="text-body font-medium text-bonsai-slate-700 min-w-[180px] text-center">{dateRangeText}</span>
          <button type="button" onClick={onNextRange} className="p-1.5 text-bonsai-slate-600 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded touch-manipulation" aria-label="Next week"><ChevronRightIcon className="w-5 h-5" /></button>
        </div>
      )}
      <div className="flex min-w-0 overflow-hidden">
      <div className="shrink-0 border-r border-bonsai-slate-200 bg-white z-10 flex flex-col" style={{ width: HABIT_COLUMN_WIDTH_PX }}>
        <div className="bg-bonsai-slate-50 border-b border-bonsai-slate-200 py-2 px-3 flex items-center shrink-0" style={{ height: DATE_COLUMN_WIDTH_PX }}>
          <span className="text-secondary font-semibold text-bonsai-slate-700">HABIT</span>
        </div>
        {habits.map((habit) => (
          <div key={habit.id} className="border-b border-bonsai-slate-100 py-2 px-3 hover:bg-bonsai-slate-50/50 group flex items-center shrink-0" style={{ height: DATE_COLUMN_WIDTH_PX }}>
            <button type="button" onClick={() => onEditHabit(habit)} className="text-sm font-bold text-bonsai-brown-700 hover:text-bonsai-brown-800 text-left truncate max-w-full block w-full">{habit.name}</button>
          </div>
        ))}
      </div>
      {/* Scrollable dates + streak: horizontal scroll on mobile and tablet */}
      <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-auto">
        <table className="border-collapse" style={{ tableLayout: 'fixed', width: dates.length * DATE_COLUMN_WIDTH_PX + STREAK_COLUMN_WIDTH_PX }}>
          <thead>
            <tr className="border-b border-bonsai-slate-200 bg-bonsai-slate-50" style={{ height: DATE_COLUMN_WIDTH_PX }}>
              {dates.map((d) => {
                const isToday = d === todayYMD
                const { month, day } = formatHeaderMonthDay(d)
                return (
                  <th key={d} className={`text-center font-semibold py-0.5 px-0.5 text-xs text-bonsai-slate-700 overflow-hidden ${isToday ? 'bg-bonsai-sage-100 text-bonsai-sage-700' : 'bg-bonsai-slate-50'}`} style={{ width: DATE_COLUMN_WIDTH_PX, minWidth: DATE_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }} title={isToday ? `Today – ${formatHeader(d)}` : formatHeader(d)}>
                    <span className="block leading-none text-[10px]">{month}</span>
                    <span className="block font-semibold leading-tight mt-0.5">
                      {isToday ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bonsai-sage-300 text-bonsai-sage-800 text-xs" aria-label="Today">{day}</span> : day}
                    </span>
                  </th>
                )
              })}
              <th className="text-center text-secondary font-semibold text-bonsai-slate-700 py-2 px-3 border-l border-bonsai-slate-200 bg-bonsai-slate-50" style={{ width: STREAK_COLUMN_WIDTH_PX, minWidth: STREAK_COLUMN_WIDTH_PX }}>STREAK</th>
            </tr>
          </thead>
          <tbody>
          {habits.map((habit) => {
            const streakDates = habit.currentStreakDates
            return (
              <tr key={habit.id} className="group border-b border-bonsai-slate-100 hover:bg-bonsai-slate-50/50" style={{ height: DATE_COLUMN_WIDTH_PX }}>
                {dates.map((date) => {
                  /* Weekly habits: only selected weekdays are active; others are grayed out and not clickable */
                  const isWeekly =
                    habit.frequency === 'weekly' &&
                    typeof habit.frequency_target === 'number' &&
                    habit.frequency_target >= 1 &&
                    habit.frequency_target <= 127
                  const isSelectedDay =
                    !isWeekly || isSelectedWeekday(date, habit.frequency_target ?? 0)

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
                      className={`p-0 relative overflow-hidden ${isToday ? 'bg-bonsai-sage-100' : ''} ${!isSelectedDay ? 'bg-bonsai-slate-100' : ''}`}
                      style={{
                        width: DATE_COLUMN_WIDTH_PX,
                        minWidth: DATE_COLUMN_WIDTH_PX,
                        height: DATE_COLUMN_WIDTH_PX,
                        padding: 0,
                      }}
                      role="gridcell"
                      aria-label={`${date}: ${!isSelectedDay ? 'not scheduled' : status ?? 'open'}`}
                      data-status={!isSelectedDay ? 'disabled' : status ?? 'empty'}
                    >
                      {/* Click overlay: only on selected days for weekly; daily always clickable */}
                      {isSelectedDay && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCellClick(habit.id, date, e)
                          }}
                          className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 block opacity-0 z-20"
                          aria-label={
                            isWeekly
                              ? status === null
                                ? 'Mark complete'
                                : 'Clear'
                              : status === null
                                ? 'Mark complete'
                                : status === 'completed'
                                  ? 'Mark skipped'
                                  : 'Clear'
                          }
                          title={
                            isWeekly
                              ? status === null
                                ? 'Mark complete'
                                : 'Clear'
                              : status === null
                                ? 'Mark complete'
                                : status === 'completed'
                                  ? 'Mark skipped'
                                  : 'Clear'
                          }
                        />
                      )}
                      {/* Perfect square cell; complete/skip fill entire box (inset-0, no padding) */}
                      <div className="absolute inset-0 pointer-events-none">
                        {!isSelectedDay && (
                          <div className="w-full h-full bg-bonsai-slate-100" />
                        )}
                        {isSelectedDay && status === null && <div className="w-full h-full bg-white" />}
                        {isSelectedDay && status === 'completed' && (
                          <>
                            <div className={`absolute inset-0 ${shadeClass} completed-cell`} />
                            <div className="completed-hover-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity bg-black/10 pointer-events-none z-10">
                              <span className="text-white text-xs font-medium drop-shadow">skip</span>
                            </div>
                          </>
                        )}
                        {isSelectedDay && status === 'skipped' && (
                          <>
                            <div className="absolute inset-0 bg-white" />
                            <div
                              className={`absolute inset-0 ${shadeClass}`}
                              style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  )
                })}
                <td
                  className="py-1 px-2 text-center border-l border-bonsai-slate-200 bg-white group-hover:bg-bonsai-slate-50/50 align-middle"
                  style={{ minWidth: STREAK_COLUMN_WIDTH_PX, height: DATE_COLUMN_WIDTH_PX }}
                >
                  <div className="flex flex-col items-center justify-center gap-0 min-w-0 leading-tight">
                    <span className="text-xs font-medium text-bonsai-slate-600 whitespace-nowrap" role="img" aria-label="streak">
                      🔥 {habit.currentStreak}
                      {habit.frequency === 'weekly' && <span className="font-normal"> wk</span>}
                    </span>
                    <span className="text-[10px] text-bonsai-slate-500 whitespace-nowrap" title={`Longest streak: ${habit.longestStreak}${habit.frequency === 'weekly' ? ' wk' : ''}`}>
                      max {habit.longestStreak}
                      {habit.frequency === 'weekly' && ' wk'}
                    </span>
                  </div>
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
