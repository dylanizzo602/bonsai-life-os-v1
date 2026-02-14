/* SingleDatePickerModal: Popover for one date, time, and recurring settings; for reminders */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '../../../components/Button'
import { TimePickerModal } from '../../tasks/modals/TimePickerModal'
import { RecurringSettingsSection } from '../../tasks/modals/RecurringSettingsSection'
import {
  parseRecurrencePattern,
  serializeRecurrencePattern,
  getFutureOccurrences,
} from '../../../lib/recurrence'

export interface SingleDatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  /** Current value as ISO datetime string (or null) */
  value: string | null
  onSave: (iso: string | null, recurrencePattern: string | null) => void | Promise<void>
  /** Reference to the trigger element for popover positioning */
  triggerRef: React.RefObject<HTMLElement | null>
  /** Current recurrence pattern (JSON string); optional */
  recurrencePattern?: string | null
}

/** Parse ISO string to YYYY-MM-DD */
function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

/** Parse ISO string to time HH:mm. Empty if date-only. */
function toTimeInputValue(iso: string | null): string {
  if (!iso) return ''
  if (!iso.includes('T')) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Format HH:mm for display as "4:00 PM" */
function formatTimeDisplay(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return '12:00 PM'
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr ?? '12', 10)
  const m = parseInt(mStr ?? '0', 10)
  const hour12 = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Return YYYY-MM-DD for a Date (local) */
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

function todayYMD(): string {
  return toYMD(new Date())
}

function getOneHourFromNow(): { date: string; time: string } {
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
  return {
    date: toYMD(oneHourLater),
    time: `${String(oneHourLater.getHours()).padStart(2, '0')}:${String(oneHourLater.getMinutes()).padStart(2, '0')}`,
  }
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
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const diffMs = date.getTime() - todayDate.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays >= 2 && diffDays <= 7) return dayName
  return `${monthName} ${d}`
}

function getQuickOptionSuffix(ymd: string | null, isLater = false): string {
  if (isLater) {
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

function parseYear2(yy: number): number {
  if (yy >= 0 && yy <= 29) return 2000 + yy
  if (yy >= 30 && yy <= 99) return 1900 + yy
  return yy
}

function parseDateInput(str: string): string | null {
  const s = str.trim().toLowerCase()
  if (!s) return null
  if (s === 'today') return todayYMD()
  if (s === 'tomorrow') return toYMD(addDays(new Date(), 1))
  if (s === 'yesterday') return toYMD(addDays(new Date(), -1))
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const mdy4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy4) {
    const d = new Date(parseInt(mdy4[3]), parseInt(mdy4[1]) - 1, parseInt(mdy4[2]))
    if (!isNaN(d.getTime())) return toYMD(d)
  }
  const mdy2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (mdy2) {
    const y = parseYear2(parseInt(mdy2[3], 10))
    const d = new Date(y, parseInt(mdy2[1], 10) - 1, parseInt(mdy2[2], 10))
    if (!isNaN(d.getTime())) return toYMD(d)
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return toYMD(d)
  return null
}

function parseTimeInput(str: string): string | null {
  const s = str.trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (m) {
    let h = parseInt(m[1], 10)
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
    const ampm = m[3]?.toLowerCase()
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    if (!ampm && (h < 0 || h > 23)) return null
    if (ampm && (h < 1 || h > 12)) return null
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  const m2 = s.match(/^(\d{1,2})\s*(am|pm)$/i)
  if (m2) {
    let h = parseInt(m2[1], 10)
    const ampm = m2[2].toLowerCase()
    if (h < 1 || h > 12) return null
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

/** Build ISO string from date and time; default time 09:00 if no time */
function toISO(dateStr: string, timeStr: string): string {
  const t = timeStr || '09:00'
  return new Date(`${dateStr}T${t}:00`).toISOString()
}

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

interface CalendarCell {
  date: Date
  ymd: string
  isCurrentMonth: boolean
}

function getCalendarCells(viewMonth: Date): CalendarCell[] {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const first = new Date(year, month, 1)
  const firstWeekday = first.getDay()
  const last = new Date(year, month + 1, 0)
  const daysInMonth = last.getDate()
  const cells: CalendarCell[] = []
  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(year, month, -firstWeekday + i + 1)
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function SingleDatePickerModal({
  isOpen,
  onClose,
  value,
  onSave,
  triggerRef,
  recurrencePattern: recurrencePatternProp,
}: SingleDatePickerModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const timeTriggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  /* Recurrence: parsed pattern for RecurringSettingsSection */
  const [recurrencePattern, setRecurrencePattern] = useState(parseRecurrencePattern(recurrencePatternProp ?? null))
  /* Toggle: show suggested dates (default) vs recurring settings in left column */
  const [showRecurringSection, setShowRecurringSection] = useState(false)

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [dateEdit, setDateEdit] = useState('')
  const [timeEdit, setTimeEdit] = useState('')
  const [showTime, setShowTime] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [timePickerOpen, setTimePickerOpen] = useState(false)

  /* Position: center on mobile/tablet (< 1024px); below trigger on desktop */
  const DESKTOP_BREAKPOINT = 1024

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return
    const updatePosition = () => {
      if (!popoverRef.current) return
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      let top: number
      let left: number
      if (viewportWidth < DESKTOP_BREAKPOINT) {
        top = Math.max(padding, (viewportHeight - popoverRect.height) / 2)
        left = Math.max(padding, (viewportWidth - popoverRect.width) / 2)
      } else {
        if (!triggerRef.current) return
        const triggerRect = triggerRef.current.getBoundingClientRect()
        top = triggerRect.bottom + 4
        left = triggerRect.left
        if (left + popoverRect.width > viewportWidth - padding) left = viewportWidth - popoverRect.width - padding
        if (left < padding) left = padding
      }
      setPosition({ top, left })
    }
    const t = setTimeout(updatePosition, 0)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, triggerRef])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  /* Sync state when popover opens or value changes */
  useEffect(() => {
    if (isOpen) {
      const d = toDateInputValue(value)
      const t = toTimeInputValue(value)
      setDate(d)
      setTime(t || '09:00')
      setDateEdit(d ? formatDateDisplay(d) : '')
      setTimeEdit(t ? formatTimeDisplay(t) : '')
      setShowTime(!!t)
      setRecurrencePattern(parseRecurrencePattern(recurrencePatternProp ?? null))
      setShowRecurringSection(Boolean(recurrencePatternProp))
      setViewMonth(value ? new Date(value) : new Date())
    }
  }, [isOpen, value, recurrencePatternProp])

  useEffect(() => {
    setDateEdit(date ? formatDateDisplay(date) : '')
    setTimeEdit(time ? formatTimeDisplay(time) : '')
  }, [date, time])

  const calendarCells = useMemo(() => getCalendarCells(viewMonth), [viewMonth])
  const viewMonthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`

  /* Future recurrence occurrences for calendar shading; exclude past dates */
  const futureOccurrencesSet = useMemo(() => {
    if (!recurrencePattern || !date) return new Set<string>()
    const cells = calendarCells
    if (cells.length === 0) return new Set<string>()
    const firstDate = new Date(cells[0].date)
    const lastDate = new Date(cells[cells.length - 1].date)
    const occurrences = getFutureOccurrences(recurrencePattern, date, firstDate, lastDate)
    const today = todayYMD()
    return new Set(occurrences.filter((ymd) => ymd >= today))
  }, [recurrencePattern, date, calendarCells])

  const handleSave = async () => {
    const recurrenceStr = serializeRecurrencePattern(recurrencePattern)
    if (!date) {
      const result = onSave(null, recurrenceStr)
      if (result instanceof Promise) await result
      onClose()
      return
    }
    const iso = toISO(date, showTime ? time : '09:00')
    const result = onSave(iso, recurrenceStr)
    if (result instanceof Promise) {
      try {
        await result
        onClose()
      } catch (e) {
        console.error('SingleDatePicker onSave error:', e)
      }
    } else {
      onClose()
    }
  }

  const applyDate = (ymd: string | null, isLater = false) => {
    if (ymd) {
      setDate(ymd)
      if (isLater) {
        const { time: t } = getOneHourFromNow()
        setTime(t)
        setShowTime(true)
      } else if (!showTime) {
        setTime('09:00')
      }
    } else {
      setDate('')
      setTime('')
      setShowTime(false)
    }
  }

  const goToMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const goToToday = () => {
    setViewMonth(new Date())
    applyDate(todayYMD())
  }

  const getCellClass = (ymd: string) => {
    const isToday = ymd === todayYMD()
    const isSelected = ymd === date
    const isRecurrenceOccurrence = futureOccurrencesSet.has(ymd)
    if (isSelected) return 'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700'
    if (isRecurrenceOccurrence) return 'bg-bonsai-sage-100 text-bonsai-slate-700 hover:bg-bonsai-sage-200'
    if (isToday) return 'bg-bonsai-slate-200 text-bonsai-slate-800 hover:bg-bonsai-slate-300'
    return 'text-bonsai-slate-700 hover:bg-bonsai-slate-100'
  }

  const fieldBase = 'rounded px-2 py-2 text-secondary leading-tight focus-within:ring-2 focus-within:ring-bonsai-sage-500 flex items-center gap-2 min-h-0'
  const timeInputClass = 'min-w-[3.5rem] w-[4.5rem] max-w-[5rem] shrink rounded border-0 bg-transparent py-0 text-secondary text-bonsai-slate-700 focus:outline-none focus:ring-0 text-right placeholder:text-bonsai-slate-400'

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-xl border border-bonsai-slate-200 bg-white shadow-xl p-3 sm:p-5 md:p-6 w-[calc(100vw-2rem)] max-w-xl min-w-0 sm:min-w-[18rem]"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-label="Select a date"
      /* Stop propagation so clicks inside popover do not trigger reminder row click (edit modal) */
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Single date + time row; shrink-0 so it doesn't collapse */}
      <div className={`${fieldBase} min-h-[2.75rem] shrink-0 bg-bonsai-slate-100 pb-3 sm:mb-5`}>
        <CalendarIcon className="w-4 h-4 text-bonsai-slate-500 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-nowrap">
          <input
            type="text"
            value={dateEdit}
            onChange={(e) => setDateEdit(e.target.value)}
            onBlur={() => {
              const p = parseDateInput(dateEdit)
              if (p) {
                setDate(p)
                setDateEdit(formatDateDisplay(p))
              } else {
                setDateEdit(date ? formatDateDisplay(date) : '')
              }
            }}
            placeholder="Select a date"
            className="min-w-0 flex-1 bg-transparent border-0 py-0 text-secondary text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none focus:ring-0"
            aria-label="Select a date"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              ref={timeTriggerRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowTime(true)
                if (!time) setTime('09:00')
                setTimePickerOpen(true)
              }}
              className="shrink-0 p-0.5 rounded text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100"
              aria-label="Open time picker"
            >
              <ClockIcon className="w-4 h-4" />
            </button>
            {showTime ? (
              <input
                type="text"
                value={timeEdit}
                onChange={(e) => setTimeEdit(e.target.value)}
                onBlur={() => {
                  const p = parseTimeInput(timeEdit)
                  if (p) {
                    setTime(p)
                    setTimeEdit(formatTimeDisplay(p))
                  } else {
                    setTimeEdit(time ? formatTimeDisplay(time) : '9:00 AM')
                  }
                }}
                placeholder="12:00 PM"
                className={timeInputClass}
                aria-label="Time"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowTime(true)
                  if (!time) setTime('09:00')
                  setTimeEdit('9:00 AM')
                  setTimePickerOpen(true)
                }}
                className="shrink-0 text-secondary text-bonsai-sage-600 hover:text-bonsai-sage-700 whitespace-nowrap"
              >
                Add time
              </button>
            )}
          </div>
        </div>
        {date && (
          <button
            type="button"
            onClick={() => {
              setDate('')
              setTime('')
              setShowTime(false)
            }}
            className="shrink-0 p-0.5 text-bonsai-slate-400 hover:text-bonsai-slate-600 rounded leading-none"
            aria-label="Clear date"
          >
            <span className="text-secondary">×</span>
          </button>
        )}
      </div>

      {/* Left column: suggested dates or recurring; right: calendar; flex-1 min-h-0 so content fits viewport */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[14rem_1fr] md:gap-8">
        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
          {showRecurringSection ? (
            <RecurringSettingsSection
              value={recurrencePattern}
              onChange={setRecurrencePattern}
              hasChecklists={false}
              anchorDueDate={date || undefined}
            />
          ) : (
            <>
              {QUICK_OPTIONS.map((opt) => {
                const ymd = opt.getDate()
                const suffix = getQuickOptionSuffix(ymd, opt.isLater)
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => applyDate(ymd ?? null, opt.isLater)}
                    className="text-left text-secondary text-bonsai-slate-700 hover:text-bonsai-sage-700 hover:bg-bonsai-slate-100 rounded px-2 py-1.5 transition-colors"
                  >
                    {opt.label}
                    {suffix && <span className="text-bonsai-slate-500 ml-1">{suffix}</span>}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setShowRecurringSection(true)}
                className="text-secondary text-bonsai-sage-600 hover:text-bonsai-sage-700 flex items-center gap-1.5 mt-1 px-2 py-1.5 rounded hover:bg-bonsai-slate-100 transition-colors self-start"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Set Recurring
              </button>
            </>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2 md:mb-3">
            <span className="text-secondary font-medium text-bonsai-slate-800">{viewMonthLabel}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-secondary px-2 py-1">
                Today
              </Button>
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                className="p-1.5 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100"
                aria-label="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                className="p-1.5 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100"
                aria-label="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 gap-0.5 text-center sm:gap-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-0.5 text-xs font-medium text-bonsai-slate-500 sm:py-1 sm:text-secondary">
                {wd}
              </div>
            ))}
            {calendarCells.map((cell) => (
              <button
                key={cell.ymd}
                type="button"
                onClick={() => applyDate(cell.ymd)}
                className={`rounded py-1 text-xs min-w-[1.75rem] sm:min-w-[2rem] sm:py-2 sm:text-secondary ${getCellClass(cell.ymd)} ${!cell.isCurrentMonth ? 'opacity-50' : ''}`}
              >
                {cell.date.getDate()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* When in Recurring view, Cancel goes back to date picker; otherwise closes modal */}
      <div className="mt-3 flex shrink-0 justify-end gap-3 border-t border-bonsai-slate-200 pt-3 md:mt-6 md:pt-4">
        <Button
          variant="secondary"
          onClick={showRecurringSection ? () => setShowRecurringSection(false) : onClose}
        >
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>

      <TimePickerModal
        isOpen={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        value={time || '09:00'}
        onChange={setTime}
        triggerRef={timeTriggerRef}
        ariaLabel="Select time"
      />
    </div>
  )
}
