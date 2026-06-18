/* DatePickerModal: Schedule popover for start/due dates, quick picks, calendar, and repeat options */

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'
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

/** True when ISO encodes a real clock time (not date-only / not UTC midnight placeholder). */
function hasExplicitWallTimeInIso(iso: string): boolean {
  const timeMatch = iso.match(/T(\d{2}):(\d{2})/)
  return !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
}

/** Parse ISO string to date input value (YYYY-MM-DD). Uses civil date from string for date-only / midnight UTC so picker matches task list. */
function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  if (!iso.includes('T') || !hasExplicitWallTimeInIso(iso)) {
    const ymd = iso.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : ''
  }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return toYMD(d)
}

/** Parse ISO string to time input value (HH:mm).
 * Returns empty string for date-only strings or midnight-only timestamps
 * (e.g. 2026-03-31T00:00:00+00:00) so cleared times do not reappear.
 */
function toTimeInputValue(iso: string | null): string {
  if (!iso) return ''
  /* If date-only string (YYYY-MM-DD), return empty string */
  if (!iso.includes('T')) return ''

  /* If time portion is exactly 00:00, treat as date-only (no time) */
  const timeMatch = iso.match(/T(\d{2}):(\d{2})/)
  if (timeMatch && timeMatch[1] === '00' && timeMatch[2] === '00') {
    return ''
  }

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
  /* YYYY-MM-DD — normalize without Date() so UTC midnight parsing does not shift the calendar day */
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parts = s.split('-')
    const y = parseInt(parts[0] ?? '0', 10)
    const mo = parseInt(parts[1] ?? '0', 10)
    const day = parseInt(parts[2] ?? '0', 10)
    if (!isNaN(y) && !isNaN(mo) && !isNaN(day)) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
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

/** Parse typed time string to HH:mm (24h). Handles: 4:00 PM, 16:00, 4:30 pm, 3:00pm, 3pm */
function parseTimeInput(str: string): string | null {
  /* Normalization: trim, collapse whitespace, ignore dots (e.g. "p.m."). */
  const s = str.trim().replace(/\./g, '').replace(/\s+/g, ' ')
  if (!s) return null
  /* Match H, H:MM, HH:MM with optional am/pm (with or without space). */
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (m) {
    let h = parseInt(m[1] ?? '0', 10)
    const minRaw = m[2]
    const min = Math.min(59, Math.max(0, parseInt(minRaw ?? '0', 10)))
    const ampm = m[3]?.toLowerCase()

    /* Validate hour range based on whether am/pm is present. */
    if (!ampm && (h < 0 || h > 23)) return null
    if (ampm && (h < 1 || h > 12)) return null

    /* Convert 12h to 24h when am/pm is present. */
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0

    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
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
const MONTH_NAMES_SHORT_HEADER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format today's date as MM/DD/YYYY for input placeholders without changing selected value */
function formatTodayPlaceholder(): string {
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const yyyy = today.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

/** Format YYYY-MM-DD as MM/DD/YYYY for the schedule input row */
function formatDateMMDDYYYY(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${mm}/${dd}/${y}`
}

/** Inclusive day count between start and due (YYYY-MM-DD); null when either date is missing */
function getSelectedRangeDays(startYmd: string, dueYmd: string): number | null {
  if (!startYmd || !dueYmd) return null
  const [sy, sm, sd] = startYmd.split('-').map(Number)
  const [dy, dm, dd] = dueYmd.split('-').map(Number)
  const startDt = new Date(sy, sm - 1, sd)
  const dueDt = new Date(dy, dm - 1, dd)
  const diffMs = dueDt.getTime() - startDt.getTime()
  if (diffMs < 0) return null
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1
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
  const [position, setPosition] = useState({ top: 0, left: 0 })

  /* Recurrence: parsed pattern for RecurringSettingsSection; synced when modal opens */
  const [recurrencePattern, setRecurrencePattern] = useState(parseRecurrencePattern(recurrencePatternProp ?? null))
  /* Repeat section: expanded when an existing recurrence pattern is present */
  const [repeatSectionOpen, setRepeatSectionOpen] = useState(false)

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
  const [focusedField, _setFocusedField] = useState<'start' | 'due'>('due')
  /* Focused field ref: Avoid first-click race where state hasn't re-rendered before a calendar click */
  const focusedFieldRef = useRef<'start' | 'due'>('due')

  /* Keep focused field state + ref in sync so applyDate always uses latest user intent */
  const setFocusedField = (next: 'start' | 'due') => {
    focusedFieldRef.current = next
    _setFocusedField(next)
  }

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
      /* Initial focus: match the “active field” to what the user sees selected/highlighted on open.
       * - If only one date exists, focus that field so the first calendar click edits the highlighted date.
       * - If both exist (or neither), default to due (common “deadline” workflow).
       */
      const initialFocus: 'start' | 'due' = s && !d ? 'start' : 'due'
      setFocusedField(initialFocus)
      setStart(s)
      setDue(d)
      setStartTime(st)
      setDueTime(dt)
      setStartDateEdit(s ? formatDateMMDDYYYY(s) : '')
      setDueDateEdit(d ? formatDateMMDDYYYY(d) : '')
      setStartTimeEdit(st ? formatTimeDisplay(st) : '')
      setDueTimeEdit(dt ? formatTimeDisplay(dt) : '')
      setShowStartTime(!!st)
      setShowDueTime(!!dt)
      setRecurrencePattern(parseRecurrencePattern(recurrencePatternProp ?? null))
      setRepeatSectionOpen(Boolean(recurrencePatternProp))
      setViewMonth(startDate ? new Date(startDate) : dueDate ? new Date(dueDate) : new Date())
    }
  }, [isOpen, startDate, dueDate, recurrencePatternProp])

  /* Sync edit buffers: MM/DD/YYYY for date fields; 12h clock for time fields */
  useEffect(() => {
    setStartDateEdit(start ? formatDateMMDDYYYY(start) : '')
    setDueDateEdit(due ? formatDateMMDDYYYY(due) : '')
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
  const viewMonthLabel = `${MONTH_NAMES_SHORT_HEADER[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`
  const selectedRangeDays = getSelectedRangeDays(start, due)

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
    /* Commit typed time buffers on Save so users don't need to blur first. */
    const parsedStartOnSave =
      showStartTime && startTimeEdit.trim() ? parseTimeInput(startTimeEdit) : null
    const parsedDueOnSave =
      showDueTime && dueTimeEdit.trim() ? parseTimeInput(dueTimeEdit) : null
    const effectiveStartTime = parsedStartOnSave ?? startTime
    const effectiveDueTime = parsedDueOnSave ?? dueTime

    let startISO = start ? toISO(start, showStartTime ? effectiveStartTime || undefined : undefined) : null
    let dueISO = due ? toISO(due, showDueTime ? effectiveDueTime || undefined : undefined) : null
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
    /* Use ref to avoid stale focusedField during fast click sequences (Start input -> calendar click) */
    const targetField = focusedFieldRef.current
    if (isLater) {
      /* Later: set date and time to one hour from now */
      const { date, time } = getOneHourFromNow()
      if (targetField === 'start') {
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
      if (targetField === 'start') {
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
  const getCellClass = (ymd: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return 'text-outline/40'
    const isStart = ymd === start
    const isDue = ymd === due
    const inRange = isBetween(ymd, start, due)
    const isRecurrenceOccurrence = futureOccurrencesSet.has(ymd)
    if (isStart || isDue) {
      return 'rounded-lg border border-sage/30 bg-sage/20 font-bold text-sage'
    }
    if (inRange || isRecurrenceOccurrence) {
      return 'rounded-lg bg-sage/10 text-on-surface hover:bg-sage/15'
    }
    return 'rounded-lg hover:bg-surface-container-high'
  }

  /* Time input: editable; flexible width for small screens */
  const timeInputClass =
    'min-w-0 w-[4rem] max-w-[4.5rem] shrink rounded border-0 bg-transparent py-0 text-sm font-medium text-on-surface focus:outline-none focus:ring-0 text-right placeholder:text-outline'

  /* Date field shell: active (focused) vs inactive styling from schedule mock */
  const dateFieldShell = (field: 'start' | 'due') => {
    const isActive = focusedField === field
    return isActive
      ? 'border-[1.5px] border-sage bg-bonsai-sage-50'
      : 'border-[1.5px] border-transparent bg-bonsai-slate-100'
  }

  if (!isOpen) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] bg-on-surface/20"
      aria-hidden
      onClick={onClose}
    />
  )

  const popover = (
    <div
      ref={popoverRef}
      className="fixed z-[10000] flex max-h-[calc(100vh-16px)] min-h-0 w-[calc(100vw-2rem)] max-w-2xl min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-label="Select start and due date"
      /* Stop propagation so clicks inside popover do not open the task edit modal (row click) */
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
        {/* Header: title, subtitle, and close */}
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-body font-bold text-on-surface">
              Select<span className="text-body">&nbsp;date(s)</span>
            </h1>
            <p className="mt-0.5 text-secondary text-on-surface-variant">
              Select a start and due date for your project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-outline transition-colors hover:text-on-surface"
            aria-label="Close schedule picker"
          >
            <MaterialIcon name="close" />
          </button>
        </header>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto">
          {/* Start and due date inputs */}
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:gap-4">
            {/* Start date field */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label
                className={`px-1 text-[11px] font-bold uppercase tracking-wider ${
                  focusedField === 'start' ? 'text-sage' : 'text-outline'
                }`}
              >
                Start Date
              </label>
              <div
                className={`flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-2 sm:gap-2 sm:px-3 sm:py-2.5 ${dateFieldShell('start')}`}
                onPointerDown={() => setFocusedField('start')}
                onClick={() => setFocusedField('start')}
              >
                <MaterialIcon
                  name="calendar_today"
                  className={`shrink-0 text-lg ${focusedField === 'start' ? 'text-sage' : 'text-outline'}`}
                />
                <input
                  type="text"
                  value={startDateEdit}
                  onChange={(e) => setStartDateEdit(e.target.value)}
                  onFocus={() => setFocusedField('start')}
                  onBlur={() => {
                    const p = parseDateInput(startDateEdit)
                    if (p) {
                      setStart(p)
                      setStartDateEdit(formatDateMMDDYYYY(p))
                      if (p) setFocusedField('due')
                    } else {
                      setStartDateEdit(start ? formatDateMMDDYYYY(start) : '')
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setFocusedField('start')
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setFocusedField('start')
                  }}
                  placeholder={formatTodayPlaceholder()}
                  className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium text-on-surface placeholder:text-outline focus:outline-none focus:ring-0"
                  aria-label="Start date"
                />
                <MaterialIcon
                  name="schedule"
                  className={`shrink-0 text-lg ${focusedField === 'start' ? 'text-sage' : 'text-outline'}`}
                />
                {showStartTime ? (
                  <input
                    type="text"
                    value={startTimeEdit}
                    onChange={(e) => setStartTimeEdit(e.target.value)}
                    onFocus={() => setFocusedField('start')}
                    onBlur={() => {
                      const p = parseTimeInput(startTimeEdit)
                      if (p) {
                        setStartTime(p)
                        setStartTimeEdit(formatTimeDisplay(p))
                      } else {
                        const trimmed = startTimeEdit.trim()
                        if (!trimmed) {
                          setStartTime('')
                          setStartTimeEdit('')
                          setShowStartTime(false)
                        } else {
                          setStartTimeEdit(startTime ? formatTimeDisplay(startTime) : '')
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        ;(e.currentTarget as HTMLInputElement).blur()
                      }
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setFocusedField('start')
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="12:00 PM"
                    className={timeInputClass}
                    aria-label="Start time"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowStartTime(true)
                    }}
                    className="shrink-0 text-xs font-medium text-on-surface sm:text-sm"
                  >
                    Add time
                  </button>
                )}
                {start && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setStart('')
                      setShowStartTime(false)
                    }}
                    className="shrink-0 rounded-full p-0.5 text-outline-variant transition-colors hover:text-error"
                    aria-label="Clear start date"
                  >
                    <MaterialIcon name="close" className="text-sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Due date field */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label
                className={`px-1 text-[11px] font-bold uppercase tracking-wider ${
                  focusedField === 'due' ? 'text-sage' : 'text-outline'
                }`}
              >
                Due Date
              </label>
              <div
                className={`flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-2 sm:gap-2 sm:px-3 sm:py-2.5 ${dateFieldShell('due')}`}
                onPointerDown={() => setFocusedField('due')}
                onClick={() => setFocusedField('due')}
              >
                <MaterialIcon
                  name="calendar_today"
                  className={`shrink-0 text-lg ${focusedField === 'due' ? 'text-sage' : 'text-outline'}`}
                />
                <input
                  type="text"
                  value={dueDateEdit}
                  onChange={(e) => setDueDateEdit(e.target.value)}
                  onFocus={() => setFocusedField('due')}
                  onBlur={() => {
                    const p = parseDateInput(dueDateEdit)
                    if (p) {
                      setDue(p)
                      setDueDateEdit(formatDateMMDDYYYY(p))
                      if (p) setFocusedField('start')
                    } else {
                      setDueDateEdit(due ? formatDateMMDDYYYY(due) : '')
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setFocusedField('due')
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setFocusedField('due')
                  }}
                  placeholder={formatTodayPlaceholder()}
                  className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium text-on-surface placeholder:text-outline focus:outline-none focus:ring-0"
                  aria-label="Due date"
                />
                <MaterialIcon
                  name="schedule"
                  className={`shrink-0 text-lg ${focusedField === 'due' ? 'text-sage' : 'text-outline'}`}
                />
                {showDueTime ? (
                  <input
                    type="text"
                    value={dueTimeEdit}
                    onChange={(e) => setDueTimeEdit(e.target.value)}
                    onFocus={() => setFocusedField('due')}
                    onBlur={() => {
                      const p = parseTimeInput(dueTimeEdit)
                      if (p) {
                        setDueTime(p)
                        setDueTimeEdit(formatTimeDisplay(p))
                      } else {
                        const trimmed = dueTimeEdit.trim()
                        if (!trimmed) {
                          setDueTime('')
                          setDueTimeEdit('')
                          setShowDueTime(false)
                        } else {
                          setDueTimeEdit(dueTime ? formatTimeDisplay(dueTime) : '')
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        ;(e.currentTarget as HTMLInputElement).blur()
                      }
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setFocusedField('due')
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="12:00 PM"
                    className={timeInputClass}
                    aria-label="Due time"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDueTime(true)
                    }}
                    className="shrink-0 text-xs font-medium text-on-surface sm:text-sm"
                  >
                    Add time
                  </button>
                )}
                {due && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDue('')
                      setShowDueTime(false)
                    }}
                    className="shrink-0 rounded-full p-0.5 text-outline-variant transition-colors hover:text-error"
                    aria-label="Clear due date"
                  >
                    <MaterialIcon name="close" className="text-sm" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick picks and calendar */}
          <div className="grid min-w-0 grid-cols-1 gap-4 rounded-lg bg-surface-container-low/50 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6 lg:p-5">
            {/* Quick select shortcuts: desktop only; mobile uses calendar + typed dates */}
            <div className="hidden space-y-1 lg:block">
              {QUICK_OPTIONS.map((opt) => {
                const date = opt.getDate()
                const suffix = getQuickOptionSuffix(date, opt.isLater)
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => applyDate(date, opt.isLater)}
                    className="flex w-full cursor-pointer items-center justify-between rounded px-1 py-2 text-sm transition-colors hover:bg-surface"
                  >
                    <span className="text-on-surface-variant">{opt.label}</span>
                    <span className="text-outline">{suffix}</span>
                  </button>
                )
              })}
            </div>

            {/* Month grid */}
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-on-surface">{viewMonthLabel}</h3>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={goToToday}
                    className="text-sm font-bold text-on-surface hover:text-sage"
                  >
                    Today
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => goToMonth(-1)}
                      className="text-outline transition-colors hover:text-on-surface"
                      aria-label="Previous month"
                    >
                      <MaterialIcon name="chevron_left" className="text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToMonth(1)}
                      className="text-outline transition-colors hover:text-on-surface"
                      aria-label="Next month"
                    >
                      <MaterialIcon name="chevron_right" className="text-xl" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-7 gap-y-1 text-center">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="mb-1 text-[10px] font-bold uppercase text-outline"
                  >
                    {wd}
                  </div>
                ))}
                {calendarCells.map((cell) => (
                  <button
                    key={cell.ymd}
                    type="button"
                    onClick={() => applyDate(cell.ymd)}
                    className={`min-w-0 px-0.5 py-1 text-sm sm:py-1.5 ${getCellClass(cell.ymd, cell.isCurrentMonth)}`}
                  >
                    {cell.date.getDate()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible repeat options */}
          <details
            className="group overflow-hidden rounded-lg bg-surface-container-low"
            open={repeatSectionOpen}
            onToggle={(e) => setRepeatSectionOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 transition-colors hover:bg-surface-container-high">
              <div className="flex items-center gap-3">
                <MaterialIcon name="repeat" className="text-on-surface-variant" />
                <span className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Repeat Options
                </span>
              </div>
              <MaterialIcon
                name="expand_more"
                className="text-outline transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-4 border-t border-outline-variant/10 p-4 pt-2 sm:space-y-6 sm:p-5">
              <RecurringSettingsSection
                value={recurrencePattern}
                onChange={setRecurrencePattern}
                hasChecklists={hasChecklists}
                anchorDueDate={due || undefined}
              />
            </div>
          </details>
        </div>

        {/* Footer: range summary, cancel, and apply */}
        <footer className="flex w-full min-w-0 shrink-0 flex-col items-stretch justify-end gap-3 border-t border-outline-variant/30 pt-3 sm:flex-row sm:items-center sm:gap-4 sm:pt-4">
          {selectedRangeDays != null && (
            <div className="flex min-w-0 items-center gap-2 text-xs text-on-surface-variant sm:mr-auto">
              <MaterialIcon name="info" className="text-[18px]" />
              <span>Selected range: {selectedRangeDays} days</span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg px-6 py-2.5 font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="w-full rounded-lg bg-sage px-6 py-2.5 font-bold text-white shadow-lg shadow-sage/20 transition-all active:scale-[0.98] hover:bg-primary-container sm:w-auto sm:px-8 sm:py-3"
          >
            Apply Date(s)
          </button>
        </footer>
      </div>
    </div>
  )

  return createPortal(
    <>
      {overlay}
      {popover}
    </>,
    document.body,
  )
}
