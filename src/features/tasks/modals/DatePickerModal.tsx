/* DatePickerModal: Start/due date and optional time picker with quick options and calendar */

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'

export interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  startDate: string | null
  dueDate: string | null
  onSave: (start: string | null, due: string | null) => void | Promise<void>
}

/** Parse ISO string to date input value (YYYY-MM-DD) */
function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

/** Parse ISO string to time input value (HH:mm). Returns empty string for date-only strings. */
function toTimeInputValue(iso: string | null): string {
  if (!iso) return ''
  /* If date-only string (YYYY-MM-DD), return empty string */
  if (!iso.includes('T')) return ''
  const d = new Date(iso)
  const hours = d.getHours()
  const mins = d.getMinutes()
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** Build ISO string from date (YYYY-MM-DD) and optional time (HH:mm). Returns date-only string (YYYY-MM-DD) when no time provided. */
function toISO(dateStr: string, timeStr?: string): string | null {
  if (!dateStr) return null
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`).toISOString()
  }
  /* Return date-only string (YYYY-MM-DD) when no time is provided */
  return dateStr
}

/** Return YYYY-MM-DD for a given Date (local date) */
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Compare two YYYY-MM-DD strings; return -1, 0, or 1 */
function compareYMD(a: string, b: string): number {
  if (!a || !b) return 0
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** Check if YYYY-MM-DD is strictly between start and due (exclusive) */
function isBetween(dateYMD: string, startYMD: string, dueYMD: string): boolean {
  if (!startYMD || !dueYMD) return false
  return compareYMD(startYMD, dateYMD) < 0 && compareYMD(dateYMD, dueYMD) < 0
}

/** Get today's date as YYYY-MM-DD (local) */
function todayYMD(): string {
  return toYMD(new Date())
}

/** Get date and time one hour from now */
function getOneHourFromNow(): { date: string; time: string } {
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
  return {
    date: toYMD(oneHourLater),
    time: `${String(oneHourLater.getHours()).padStart(2, '0')}:${String(oneHourLater.getMinutes()).padStart(2, '0')}`,
  }
}

/** Quick option presets: label and optional date (null = clears date) */
const QUICK_OPTIONS: { label: string; getDate: () => string | null; isLater?: boolean }[] = [
  { label: 'Today', getDate: () => todayYMD() },
  { label: 'Later', getDate: () => getOneHourFromNow().date, isLater: true },
  { label: 'Tomorrow', getDate: () => toYMD(addDays(new Date(), 1)) },
  { label: 'This weekend', getDate: () => getSaturdayThisWeek() },
  { label: 'Next week', getDate: () => getNextMonday() },
  { label: 'Next weekend', getDate: () => getSaturdayNextWeek() },
  { label: '2 weeks', getDate: () => toYMD(addDays(new Date(), 14)) },
  { label: '4 weeks', getDate: () => toYMD(addDays(new Date(), 28)) },
]

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

function getSaturdayThisWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const sat = day === 6 ? 0 : 6 - day
  return toYMD(addDays(d, sat))
}

function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  return toYMD(addDays(d, daysUntilMonday))
}

function getSaturdayNextWeek(): string {
  const d = addDays(new Date(), 7)
  const day = d.getDay()
  const sat = day === 6 ? 0 : 6 - day
  return toYMD(addDays(d, sat))
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format YYYY-MM-DD for display: Yesterday, Today, Tomorrow, day of week (within next 7 days), or "d Mon" */
function formatDateDisplay(ymd: string): string {
  const today = todayYMD()
  const yesterday = toYMD(addDays(new Date(), -1))
  const tomorrow = toYMD(addDays(new Date(), 1))
  if (ymd === yesterday) return 'Yesterday'
  if (ymd === today) return 'Today'
  if (ymd === tomorrow) return 'Tomorrow'
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dayName = DAY_NAMES[date.getDay()]
  const monthName = MONTH_NAMES_SHORT[date.getMonth()]
  /* Within the next 7 days (today+2 through today+7): show day of week */
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const diffMs = date.getTime() - todayDate.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays >= 2 && diffDays <= 7) return dayName
  return `${d} ${monthName}`
}

/** Get display suffix for quick option list: time for "Later", day name for yesterday/today/tomorrow, else formatDateDisplay */
function getQuickOptionSuffix(ymd: string | null, isLater = false): string {
  if (isLater) {
    /* Later: show time one hour from now */
    const { time } = getOneHourFromNow()
    const [h, m] = time.split(':').map(Number)
    const hour12 = h % 12 || 12
    const ampm = h < 12 ? 'am' : 'pm'
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
  }
  if (!ymd) {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const hour12 = h % 12 || 12
    const ampm = h < 12 ? 'am' : 'pm'
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
  }
  const yesterday = toYMD(addDays(new Date(), -1))
  const today = todayYMD()
  const tomorrow = toYMD(addDays(new Date(), 1))
  if (ymd === yesterday || ymd === today || ymd === tomorrow) {
    const [y, m, d] = ymd.split('-').map(Number)
    return DAY_NAMES[new Date(y, m - 1, d).getDay()]
  }
  return formatDateDisplay(ymd)
}

/** Calendar cell: date and whether it belongs to the viewed month */
interface CalendarCell {
  date: Date
  ymd: string
  isCurrentMonth: boolean
}

/** Build calendar grid for a given month (6 rows × 7 days, Sun–Sat) */
function getCalendarCells(viewMonth: Date): CalendarCell[] {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const firstWeekday = first.getDay()
  const daysInMonth = last.getDate()
  const cells: CalendarCell[] = []
  const startOffset = firstWeekday
  const leading = startOffset
  for (let i = 0; i < leading; i++) {
    const d = new Date(year, month, -leading + i + 1)
    cells.push({ date: d, ymd: toYMD(d), isCurrentMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    cells.push({ date: d, ymd: toYMD(d), isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let i = 0; i < remaining; i++) {
    const d = new Date(year, month + 1, i + 1)
    cells.push({ date: d, ymd: toYMD(d), isCurrentMonth: false })
  }
  return cells
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Calendar icon for date fields */
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

export function DatePickerModal({
  isOpen,
  onClose,
  startDate,
  dueDate,
  onSave,
}: DatePickerModalProps) {
  /* Date/time state: YYYY-MM-DD and optional HH:mm for start and due */
  const [start, setStart] = useState('')
  const [due, setDue] = useState('')
  const [startTime, setStartTime] = useState('')
  const [dueTime, setDueTime] = useState('')
  /* Toggles for showing "Add time" inputs */
  const [showStartTime, setShowStartTime] = useState(false)
  const [showDueTime, setShowDueTime] = useState(false)
  /* Calendar view: which month is displayed */
  const [viewMonth, setViewMonth] = useState(() => new Date())
  /* Which field (start or due) receives quick pick and calendar clicks */
  const [focusedField, setFocusedField] = useState<'start' | 'due'>('due')

  /* Sync state when modal opens or props change */
  useEffect(() => {
    if (isOpen) {
      setStart(toDateInputValue(startDate))
      setDue(toDateInputValue(dueDate))
      setStartTime(toTimeInputValue(startDate))
      setDueTime(toTimeInputValue(dueDate))
      setShowStartTime(!!toTimeInputValue(startDate))
      setShowDueTime(!!toTimeInputValue(dueDate))
      setViewMonth(startDate ? new Date(startDate) : dueDate ? new Date(dueDate) : new Date())
    }
  }, [isOpen, startDate, dueDate])

  /* Build calendar grid for viewMonth */
  const calendarCells = useMemo(() => getCalendarCells(viewMonth), [viewMonth])
  const viewMonthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`

  /* Handle save: build ISO from date + optional time for both start and due */
  const handleSave = async () => {
    const startISO = start ? toISO(start, showStartTime ? startTime || undefined : undefined) : null
    const dueISO = due ? toISO(due, showDueTime ? dueTime || undefined : undefined) : null
    const result = onSave(startISO, dueISO)
    if (result instanceof Promise) {
      try {
        await result
        onClose()
      } catch (error) {
        console.error('Error in onSave callback:', error)
      }
    } else {
      onClose()
    }
  }

  /* Apply quick option or calendar date to the focused field, then auto-switch to the other field */
  const applyDate = (ymd: string | null, isLater = false) => {
    if (isLater) {
      /* Later: set date and time to one hour from now */
      const { date, time } = getOneHourFromNow()
      if (focusedField === 'start') {
        setStart(date)
        setStartTime(time)
        setShowStartTime(true)
        setFocusedField('due')
      } else {
        setDue(date)
        setDueTime(time)
        setShowDueTime(true)
        setFocusedField('start')
      }
    } else {
      if (focusedField === 'start') {
        setStart(ymd ?? '')
        if (!ymd) setShowStartTime(false)
        /* Auto-switch to due date after selecting start date */
        if (ymd) setFocusedField('due')
      } else {
        setDue(ymd ?? '')
        if (!ymd) setShowDueTime(false)
        /* Auto-switch to start date after selecting due date */
        if (ymd) setFocusedField('start')
      }
    }
  }

  /* Navigate calendar to a given month */
  const goToMonth = (delta: number) => {
    setViewMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      return next
    })
  }

  /* Jump to today in calendar and set focused field to today */
  const goToToday = () => {
    const today = new Date()
    setViewMonth(today)
    applyDate(todayYMD())
  }

  /* Resolve cell shading: today, start, due, or range */
  const getCellClass = (ymd: string) => {
    const isToday = ymd === todayYMD()
    const isStart = ymd === start
    const isDue = ymd === due
    const inRange = isBetween(ymd, start, due)
    if (isStart || isDue) return 'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700'
    if (inRange) return 'bg-bonsai-sage-100 text-bonsai-slate-800 hover:bg-bonsai-sage-200'
    if (isToday) return 'bg-bonsai-slate-200 text-bonsai-slate-800 hover:bg-bonsai-slate-300'
    return 'text-bonsai-slate-700 hover:bg-bonsai-slate-100'
  }

  /* Inline field row: one row with date display + time (or Add time) + clear */
  const inlineFieldBase = 'rounded-lg border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-bonsai-sage-500 focus-within:border-bonsai-sage-500'
  const timeInputClass = 'w-[6.5rem] rounded border-0 bg-transparent py-0 text-sm text-bonsai-slate-700 focus:outline-none focus:ring-0'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start / due date"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <div className="max-w-2xl w-full">
        {/* Top row: Start date and Due date — single line with date + time inline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div
            className={`${inlineFieldBase} ${focusedField === 'start' ? 'border-bonsai-sage-500 ring-1 ring-bonsai-sage-500' : 'border-bonsai-slate-300'}`}
            onClick={() => setFocusedField('start')}
          >
            <label className="block text-xs font-medium text-bonsai-slate-500 mb-1">Start date</label>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-4 h-4 text-bonsai-slate-500 shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1.5 min-h-8">
                <div className="relative shrink-0 min-w-[5rem]">
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value)
                      /* Auto-switch to due date after selecting start date */
                      if (e.target.value) setFocusedField('due')
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    aria-label="Start date"
                  />
                  <span className="pointer-events-none text-bonsai-slate-700">
                    {start ? formatDateDisplay(start) : 'Select date'}
                  </span>
                </div>
                {showStartTime && (
                  <>
                    <span className="text-bonsai-slate-400 shrink-0">·</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={timeInputClass}
                      aria-label="Start time"
                    />
                  </>
                )}
                {!showStartTime && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowStartTime(true) }}
                    className="shrink-0 text-xs text-bonsai-sage-600 hover:text-bonsai-sage-700"
                  >
                    Add time
                  </button>
                )}
              </div>
              {start && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setStart(''); setShowStartTime(false) }}
                  className="shrink-0 p-0.5 text-bonsai-slate-400 hover:text-bonsai-slate-600 rounded"
                  aria-label="Clear start date"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              )}
            </div>
          </div>
          <div
            className={`${inlineFieldBase} ${focusedField === 'due' ? 'border-bonsai-sage-500 ring-1 ring-bonsai-sage-500' : 'border-bonsai-slate-300'}`}
            onClick={() => setFocusedField('due')}
          >
            <label className="block text-xs font-medium text-bonsai-slate-500 mb-1">Due date</label>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-4 h-4 text-bonsai-slate-500 shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1.5 min-h-8">
                <div className="relative shrink-0 min-w-[5rem]">
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => {
                      setDue(e.target.value)
                      /* Auto-switch to start date after selecting due date */
                      if (e.target.value) setFocusedField('start')
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    aria-label="Due date"
                  />
                  <span className="pointer-events-none text-bonsai-slate-700">
                    {due ? formatDateDisplay(due) : 'Select date'}
                  </span>
                </div>
                {showDueTime && (
                  <>
                    <span className="text-bonsai-slate-400 shrink-0">·</span>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={timeInputClass}
                      aria-label="Due time"
                    />
                  </>
                )}
                {!showDueTime && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDueTime(true) }}
                    className="shrink-0 text-xs text-bonsai-sage-600 hover:text-bonsai-sage-700"
                  >
                    Add time
                  </button>
                )}
              </div>
              {due && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDue(''); setShowDueTime(false) }}
                  className="shrink-0 p-0.5 text-bonsai-slate-400 hover:text-bonsai-slate-600 rounded"
                  aria-label="Clear due date"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Two columns: quick options (left) and calendar (right) */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-6">
          {/* Left column: Quick date options + Set Recurring placeholder */}
          <div className="flex flex-col gap-0.5 border-bonsai-slate-200 md:border-r md:pr-6 md:border-b-0">
            {QUICK_OPTIONS.map((opt) => {
              const date = opt.getDate()
              const suffix = getQuickOptionSuffix(date, opt.isLater)
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => applyDate(date, opt.isLater)}
                  className="flex items-center justify-between gap-4 rounded px-2 py-1.5 text-left text-sm text-bonsai-slate-700 hover:bg-bonsai-slate-100 w-full"
                >
                  <span>{opt.label}</span>
                  <span className="text-bonsai-slate-500 text-xs shrink-0">{suffix}</span>
                </button>
              )
            })}
            {/* Set Recurring: placeholder button with no behavior yet */}
            <button
              type="button"
              onClick={() => {}}
              className="mt-2 flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-bonsai-slate-600 hover:bg-bonsai-slate-100 w-full border-0 bg-transparent"
              aria-label="Set recurring (not yet implemented)"
            >
              <span>Set Recurring</span>
              <svg className="w-4 h-4 text-bonsai-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right column: Calendar */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-bonsai-slate-800">{viewMonthLabel}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                  Today
                </Button>
                <button
                  type="button"
                  onClick={() => goToMonth(-1)}
                  className="p-1 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => goToMonth(1)}
                  className="p-1 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1 text-xs font-medium text-bonsai-slate-500">
                  {wd}
                </div>
              ))}
              {calendarCells.map((cell) => (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => applyDate(cell.ymd)}
                  className={`rounded py-1.5 text-sm ${getCellClass(cell.ymd)} ${!cell.isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  {cell.date.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
