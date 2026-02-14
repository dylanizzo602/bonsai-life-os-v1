/* DatePickerModal: Popover for start/due date, recurring settings, and calendar; positioned at trigger */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '../../../components/Button'
import { TimePickerModal } from './TimePickerModal'
import { RecurringSettingsSection } from './RecurringSettingsSection'
import {
  parseRecurrencePattern,
  serializeRecurrencePattern,
  getFutureOccurrences,
} from '../../../lib/recurrence'

export interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  startDate: string | null
  dueDate: string | null
  onSave: (start: string | null, due: string | null, recurrencePattern: string | null) => void | Promise<void>
  /** Reference to the trigger element (e.g. date button) for popover positioning */
  triggerRef: React.RefObject<HTMLElement | null>
  /** Current recurrence pattern (JSON string); optional */
  recurrencePattern?: string | null
  /** Whether the task has checklists (shows "Reopen checklist items" when true) */
  hasChecklists?: boolean
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

/** Format HH:mm (24h) for display as "4:00 PM" */
function formatTimeDisplay(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return '12:00 PM'
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr ?? '12', 10)
  const m = parseInt(mStr ?? '0', 10)
  const hour12 = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Parse 2-digit year to full year: 00-29 -> 2000-2029, 30-99 -> 1930-1999 */
function parseYear2(yy: number): number {
  if (yy >= 0 && yy <= 29) return 2000 + yy
  if (yy >= 30 && yy <= 99) return 1900 + yy
  return yy
}

/** Parse typed date string to YYYY-MM-DD. Handles: 1/2/26, 1/2/2026, YYYY-MM-DD, today, tomorrow, yesterday, MM-DD-YYYY */
function parseDateInput(str: string): string | null {
  const s = str.trim().toLowerCase()
  if (!s) return null
  if (s === 'today') return todayYMD()
  if (s === 'tomorrow') return toYMD(addDays(new Date(), 1))
  if (s === 'yesterday') return toYMD(addDays(new Date(), -1))
  /* YYYY-MM-DD */
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  /* M/D/YYYY or M/D/YY (1/2/26, 01/02/2026) */
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
  /* M-D-YYYY or M-D-YY */
  const mdyDash4 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdyDash4) {
    const d = new Date(parseInt(mdyDash4[3]), parseInt(mdyDash4[1], 10) - 1, parseInt(mdyDash4[2], 10))
    if (!isNaN(d.getTime())) return toYMD(d)
  }
  const mdyDash2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/)
  if (mdyDash2) {
    const y = parseYear2(parseInt(mdyDash2[3], 10))
    const d = new Date(y, parseInt(mdyDash2[1], 10) - 1, parseInt(mdyDash2[2], 10))
    if (!isNaN(d.getTime())) return toYMD(d)
  }
  /* Try native Date parse for other formats */
  const d = new Date(s)
  if (!isNaN(d.getTime())) return toYMD(d)
  return null
}

/** Parse typed time string to HH:mm (24h). Handles: 4:00 PM, 16:00, 4:30 pm */
function parseTimeInput(str: string): string | null {
  const s = str.trim()
  if (!s) return null
  /* Match H:MM or HH:MM with optional am/pm */
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
  /* Match H am/pm or HH am/pm (e.g. "4 pm") */
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

/** Returns true if start datetime is after due datetime (invalid: start must be <= due) */
function isStartAfterDue(
  start: string,
  due: string,
  startTime: string,
  dueTime: string,
  showStartTime: boolean,
  showDueTime: boolean
): boolean {
  if (!start || !due) return false
  const startDt = showStartTime && startTime ? `${start}T${startTime}:00` : `${start}T00:00:00`
  const dueDt = showDueTime && dueTime ? `${due}T${dueTime}:00` : `${due}T23:59:59`
  return startDt > dueDt
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

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

/** Get display suffix for quick option list */
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

/** Format YYYY-MM-DD for display: Yesterday, Today, Tomorrow, day of week (within next 7 days), or "Mon d" */
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
  return `${monthName} ${d}`
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

/** Clock icon for time fields */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function DatePickerModal({
  isOpen,
  onClose,
  startDate,
  dueDate,
  onSave,
  triggerRef,
  recurrencePattern: recurrencePatternProp,
  hasChecklists = false,
}: DatePickerModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const startTimeTriggerRef = useRef<HTMLButtonElement>(null)
  const dueTimeTriggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  /* Time picker: which field's time picker is open ('start' | 'due' | null) */
  const [timePickerOpen, setTimePickerOpen] = useState<'start' | 'due' | null>(null)

  /* Recurrence: parsed pattern for RecurringSettingsSection; synced when modal opens */
  const [recurrencePattern, setRecurrencePattern] = useState(parseRecurrencePattern(recurrencePatternProp ?? null))
  /* Left column: show suggested dates by default; show recurring settings when user clicks "Set Recurring" */
  const [showRecurringSection, setShowRecurringSection] = useState(false)

  /* Date/time state: YYYY-MM-DD and optional HH:mm for start and due */
  const [start, setStart] = useState('')
  const [due, setDue] = useState('')
  const [startTime, setStartTime] = useState('')
  const [dueTime, setDueTime] = useState('')
  /* Edit buffers: allow typing; synced from state, committed on blur */
  const [startDateEdit, setStartDateEdit] = useState('')
  const [dueDateEdit, setDueDateEdit] = useState('')
  const [startTimeEdit, setStartTimeEdit] = useState('')
  const [dueTimeEdit, setDueTimeEdit] = useState('')
  /* Toggles for showing "Add time" inputs */
  const [showStartTime, setShowStartTime] = useState(false)
  const [showDueTime, setShowDueTime] = useState(false)
  /* Calendar view: which month is displayed */
  const [viewMonth, setViewMonth] = useState(() => new Date())
  /* Which field (start or due) receives quick pick and calendar clicks */
  const [focusedField, setFocusedField] = useState<'start' | 'due'>('due')

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
        if (top + popoverRect.height > viewportHeight - padding) top = triggerRect.top - popoverRect.height - 4
        if (top < padding) top = padding
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

  /* Close on click outside */
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

  /* Close on ESC */
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  /* Sync state when popover opens or props change */
  useEffect(() => {
    if (isOpen) {
      const s = toDateInputValue(startDate)
      const d = toDateInputValue(dueDate)
      const st = toTimeInputValue(startDate)
      const dt = toTimeInputValue(dueDate)
      setStart(s)
      setDue(d)
      setStartTime(st)
      setDueTime(dt)
      setStartDateEdit(s ? formatDateDisplay(s) : '')
      setDueDateEdit(d ? formatDateDisplay(d) : '')
      setStartTimeEdit(st ? formatTimeDisplay(st) : '')
      setDueTimeEdit(dt ? formatTimeDisplay(dt) : '')
      setShowStartTime(!!st)
      setShowDueTime(!!dt)
      setRecurrencePattern(parseRecurrencePattern(recurrencePatternProp ?? null))
      setShowRecurringSection(Boolean(recurrencePatternProp))
      setViewMonth(startDate ? new Date(startDate) : dueDate ? new Date(dueDate) : new Date())
    }
  }, [isOpen, startDate, dueDate, recurrencePatternProp])

  /* Sync edit buffers: display formatDateDisplay when valid (Today, Tomorrow, day name, etc.) */
  useEffect(() => {
    setStartDateEdit(start ? formatDateDisplay(start) : '')
    setDueDateEdit(due ? formatDateDisplay(due) : '')
    setStartTimeEdit(startTime ? formatTimeDisplay(startTime) : '')
    setDueTimeEdit(dueTime ? formatTimeDisplay(dueTime) : '')
  }, [start, due, startTime, dueTime])

  /* Enforce start <= due: when start is after due, adjust due to match start */
  useEffect(() => {
    if (!start || !due) return
    if (isStartAfterDue(start, due, startTime, dueTime, showStartTime, showDueTime)) {
      setDue(start)
      setDueTime(startTime)
      setShowDueTime(showStartTime)
    }
  }, [start, due, startTime, dueTime, showStartTime, showDueTime])

  /* Build calendar grid for viewMonth */
  const calendarCells = useMemo(() => getCalendarCells(viewMonth), [viewMonth])
  const viewMonthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`

  /* Future recurrence occurrences for calendar shading: from first to last cell; exclude past dates */
  const futureOccurrencesSet = useMemo(() => {
    if (!recurrencePattern || !due) return new Set<string>()
    const cells = calendarCells
    if (cells.length === 0) return new Set<string>()
    const firstDate = new Date(cells[0].date)
    const lastDate = new Date(cells[cells.length - 1].date)
    const occurrences = getFutureOccurrences(recurrencePattern, due, firstDate, lastDate)
    const today = todayYMD()
    return new Set(occurrences.filter((ymd) => ymd >= today))
  }, [recurrencePattern, due, calendarCells])

  /* Handle save: build ISO from date + optional time; ensure start <= due before saving */
  const handleSave = async () => {
    let startISO = start ? toISO(start, showStartTime ? startTime || undefined : undefined) : null
    let dueISO = due ? toISO(due, showDueTime ? dueTime || undefined : undefined) : null
    /* Enforce start <= due: if invalid, use start for both (safety net before save) */
    if (startISO && dueISO && isStartAfterDue(start, due, startTime, dueTime, showStartTime, showDueTime)) {
      dueISO = startISO
    }
    const recurrenceStr = serializeRecurrencePattern(recurrencePattern)
    const result = onSave(startISO, dueISO, recurrenceStr)
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

  /* Resolve cell shading: today, start, due, range, or recurrence occurrence */
  const getCellClass = (ymd: string) => {
    const isToday = ymd === todayYMD()
    const isStart = ymd === start
    const isDue = ymd === due
    const inRange = isBetween(ymd, start, due)
    const isRecurrenceOccurrence = futureOccurrencesSet.has(ymd)
    if (isStart || isDue) return 'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700'
    if (inRange) return 'bg-bonsai-sage-100 text-bonsai-slate-800 hover:bg-bonsai-sage-200'
    if (isRecurrenceOccurrence) return 'bg-bonsai-sage-100 text-bonsai-slate-700 hover:bg-bonsai-sage-200'
    if (isToday) return 'bg-bonsai-slate-200 text-bonsai-slate-800 hover:bg-bonsai-slate-300'
    return 'text-bonsai-slate-700 hover:bg-bonsai-slate-100'
  }

  /* All text at secondary size to keep widget compact */
  const fieldBase = 'rounded px-2 py-2 text-secondary leading-tight focus-within:ring-2 focus-within:ring-bonsai-sage-500 flex items-center gap-2 min-h-0'
  /* Time input: Editable; flexible width for small screens */
  const timeInputClass = 'min-w-[3.5rem] w-[4.5rem] max-w-[5rem] shrink rounded border-0 bg-transparent py-0 text-secondary text-bonsai-slate-700 focus:outline-none focus:ring-0 text-right placeholder:text-bonsai-slate-400'

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-xl border border-bonsai-slate-200 bg-white shadow-xl p-3 sm:p-5 md:p-6 w-[calc(100vw-2rem)] max-w-xl min-w-0 sm:min-w-[18rem]"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-label="Start and due date"
      /* Stop propagation so clicks inside popover do not open the task edit modal (row click) */
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
        {/* Start and due date row: stack on small screens, side-by-side on sm+; shrink-0 so it doesn't collapse */}
        <div className="grid shrink-0 grid-cols-1 gap-3 pb-3 sm:grid-cols-2 sm:mb-5 min-w-0">
          <div
            className={`${fieldBase} min-h-[2.75rem] ${focusedField === 'start' ? 'bg-bonsai-sage-50 ring-2 ring-bonsai-sage-500' : 'bg-bonsai-slate-100'}`}
            onClick={() => setFocusedField('start')}
          >
            <CalendarIcon className="w-4 h-4 text-bonsai-slate-500 shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-nowrap">
              {/* Date input: Editable; accepts YYYY-MM-DD, today, tomorrow, MM/DD/YYYY */}
              <input
                type="text"
                value={startDateEdit}
                onChange={(e) => setStartDateEdit(e.target.value)}
                onBlur={() => {
                  const p = parseDateInput(startDateEdit)
                  if (p) {
                    setStart(p)
                    setStartDateEdit(formatDateDisplay(p))
                    if (p) setFocusedField('due')
                  } else {
                    setStartDateEdit(start ? formatDateDisplay(start) : '')
                  }
                }}
                onClick={(e) => { e.stopPropagation(); setFocusedField('start') }}
                placeholder="1/2/26"
                className="min-w-0 flex-1 bg-transparent border-0 py-0 text-secondary text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none focus:ring-0"
                aria-label="Start date"
              />
              {/* Time section: Clock icon opens picker, input allows typing; gap-2 matches calendar icon spacing */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  ref={startTimeTriggerRef}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowStartTime(true); if (!startTime) setStartTime('12:00'); setTimePickerOpen('start') }}
                  className="shrink-0 p-0.5 rounded text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100"
                  aria-label="Open time picker"
                >
                  <ClockIcon className="w-4 h-4" />
                </button>
                {showStartTime ? (
                  <input
                    type="text"
                    value={startTimeEdit}
                    onChange={(e) => setStartTimeEdit(e.target.value)}
                    onBlur={() => {
                      const p = parseTimeInput(startTimeEdit)
                      if (p) {
                        setStartTime(p)
                        setStartTimeEdit(formatTimeDisplay(p))
                      } else {
                        setStartTimeEdit(startTime ? formatTimeDisplay(startTime) : '12:00 PM')
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="12:00 PM"
                    className={timeInputClass}
                    aria-label="Start time"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowStartTime(true); if (!startTime) setStartTime('12:00'); setStartTimeEdit('12:00 PM') }}
                    className="shrink-0 text-secondary text-bonsai-sage-600 hover:text-bonsai-sage-700 whitespace-nowrap"
                  >
                    Add time
                  </button>
                )}
              </div>
            </div>
            {start && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setStart(''); setShowStartTime(false) }}
                className="shrink-0 p-0.5 text-bonsai-slate-400 hover:text-bonsai-slate-600 rounded leading-none"
                aria-label="Clear start date"
              >
                <span className="text-secondary">×</span>
              </button>
            )}
          </div>
          <div
            className={`${fieldBase} min-h-[2.75rem] ${focusedField === 'due' ? 'bg-bonsai-sage-50 ring-2 ring-bonsai-sage-500' : 'bg-bonsai-slate-100'}`}
            onClick={() => setFocusedField('due')}
          >
            <CalendarIcon className="w-4 h-4 text-bonsai-slate-500 shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-nowrap">
              {/* Date input: Editable; accepts YYYY-MM-DD, today, tomorrow, MM/DD/YYYY */}
              <input
                type="text"
                value={dueDateEdit}
                onChange={(e) => setDueDateEdit(e.target.value)}
                onBlur={() => {
                  const p = parseDateInput(dueDateEdit)
                  if (p) {
                    setDue(p)
                    setDueDateEdit(formatDateDisplay(p))
                    if (p) setFocusedField('start')
                  } else {
                    setDueDateEdit(due ? formatDateDisplay(due) : '')
                  }
                }}
                onClick={(e) => { e.stopPropagation(); setFocusedField('due') }}
                placeholder="1/2/26"
                className="min-w-0 flex-1 bg-transparent border-0 py-0 text-secondary text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none focus:ring-0"
                aria-label="Due date"
              />
              {/* Time section: Clock icon opens picker, input allows typing; gap-2 matches calendar icon spacing */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  ref={dueTimeTriggerRef}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowDueTime(true); if (!dueTime) setDueTime('12:00'); setTimePickerOpen('due') }}
                  className="shrink-0 p-0.5 rounded text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100"
                  aria-label="Open time picker"
                >
                  <ClockIcon className="w-4 h-4" />
                </button>
                {showDueTime ? (
                  <input
                    type="text"
                    value={dueTimeEdit}
                    onChange={(e) => setDueTimeEdit(e.target.value)}
                    onBlur={() => {
                      const p = parseTimeInput(dueTimeEdit)
                      if (p) {
                        setDueTime(p)
                        setDueTimeEdit(formatTimeDisplay(p))
                      } else {
                        setDueTimeEdit(dueTime ? formatTimeDisplay(dueTime) : '12:00 PM')
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="12:00 PM"
                    className={timeInputClass}
                    aria-label="Due time"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDueTime(true); if (!dueTime) setDueTime('12:00'); setDueTimeEdit('12:00 PM') }}
                    className="shrink-0 text-secondary text-bonsai-sage-600 hover:text-bonsai-sage-700 whitespace-nowrap"
                  >
                    Add time
                  </button>
                )}
              </div>
            </div>
            {due && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDue(''); setShowDueTime(false) }}
                className="shrink-0 p-0.5 text-bonsai-slate-400 hover:text-bonsai-slate-600 rounded leading-none"
                aria-label="Clear due date"
              >
                <span className="text-secondary">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Suggested dates (left) or recurring settings; calendar (right); flex-1 min-h-0 so content fits viewport */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[14rem_1fr] md:gap-8">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            {showRecurringSection ? (
              <RecurringSettingsSection
                value={recurrencePattern}
                onChange={setRecurrencePattern}
                hasChecklists={hasChecklists}
                anchorDueDate={due || undefined}
              />
            ) : (
              <>
                {QUICK_OPTIONS.map((opt) => {
                  const date = opt.getDate()
                  const suffix = getQuickOptionSuffix(date, opt.isLater)
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => applyDate(date, opt.isLater)}
                      className="flex items-center justify-between gap-3 rounded px-2 py-2 text-left text-secondary text-bonsai-slate-700 hover:bg-bonsai-slate-100 w-full"
                    >
                      <span>{opt.label}</span>
                      <span className="text-secondary text-bonsai-slate-500 shrink-0 min-w-[3.25rem] text-right">{suffix}</span>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setShowRecurringSection(true)}
                  className="mt-2 flex items-center justify-between gap-2 rounded px-2 py-2 text-secondary text-bonsai-slate-600 hover:bg-bonsai-slate-100 w-full border-0 bg-transparent"
                  aria-label="Set recurring"
                >
                  <span>Set Recurring</span>
                  <svg className="w-4 h-4 text-bonsai-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            {/* Calendar header: Month and year with Today and nav buttons */}
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

      {/* Save and Cancel: when in Recurring view, Cancel goes back to date picker; otherwise closes modal */}
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

      {/* Custom time picker for start time: Opens when start time display is clicked */}
      <TimePickerModal
        isOpen={timePickerOpen === 'start'}
        onClose={() => setTimePickerOpen(null)}
        value={startTime || '12:00'}
        onChange={setStartTime}
        triggerRef={startTimeTriggerRef}
        ariaLabel="Select start time"
      />
      {/* Custom time picker for due time: Opens when due time display is clicked */}
      <TimePickerModal
        isOpen={timePickerOpen === 'due'}
        onClose={() => setTimePickerOpen(null)}
        value={dueTime || '12:00'}
        onChange={setDueTime}
        triggerRef={dueTimeTriggerRef}
        ariaLabel="Select due time"
      />
    </div>
  )
}
