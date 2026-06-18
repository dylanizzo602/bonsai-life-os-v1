/* HabitDatePickerModal: Single-date calendar picker styled like the task DatePickerModal */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../../components/MaterialIcon'

export interface HabitDatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  /** Selected date as YYYY-MM-DD */
  value: string
  onSelect: (ymd: string) => void
}

interface CalendarCell {
  date: Date
  ymd: string
  isCurrentMonth: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format Date as local YYYY-MM-DD */
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayYMD(): string {
  return toYMD(new Date())
}

/** Build calendar grid for a given month (6 rows × 7 days, Sun–Sat) */
function getCalendarCells(viewMonth: Date): CalendarCell[] {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarCell[] = []

  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(year, month, -firstWeekday + i + 1)
    cells.push({ date: d, ymd: toYMD(d), isCurrentMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    cells.push({ date: d, ymd: toYMD(d), isCurrentMonth: true })
  }
  while (cells.length < 42) {
    const d = new Date(year, month + 1, cells.length - firstWeekday - daysInMonth + 1)
    cells.push({ date: d, ymd: toYMD(d), isCurrentMonth: false })
  }
  return cells
}

/**
 * Centered modal with calendar only (no quick-pick sidebar) for habit day selection.
 */
export function HabitDatePickerModal({ isOpen, onClose, value, onSelect }: HabitDatePickerModalProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date())

  /* Sync calendar view when modal opens */
  useEffect(() => {
    if (isOpen && value) {
      const [y, m, d] = value.split('-').map(Number)
      if (y && m && d) {
        setViewMonth(new Date(y, m - 1, d))
      }
    }
  }, [isOpen, value])

  /* Close on ESC */
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const calendarCells = useMemo(() => getCalendarCells(viewMonth), [viewMonth])
  const viewMonthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`
  const today = todayYMD()

  const handleSelectDate = (ymd: string) => {
    onSelect(ymd)
    onClose()
  }

  const goToMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const goToToday = () => {
    setViewMonth(new Date())
    handleSelectDate(today)
  }

  const getCellClass = (ymd: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return 'text-outline/40'
    if (ymd === value) {
      return 'rounded-lg border border-sage/30 bg-sage/20 font-bold text-sage'
    }
    if (ymd === today) {
      return 'rounded-lg font-semibold text-primary hover:bg-surface-container-high'
    }
    return 'rounded-lg hover:bg-surface-container-high'
  }

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] bg-on-surface/20" aria-hidden onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-[10000] flex max-h-[calc(100vh-16px)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
        role="dialog"
        aria-label="Select date"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4">
          <h2 className="text-body font-semibold text-on-surface">Select date</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
            aria-label="Close"
          >
            <MaterialIcon name="close" className="text-on-surface-variant" />
          </button>
        </div>

        {/* Calendar */}
        <div className="p-4 md:p-6">
          <div className="rounded-lg bg-surface-container-low/50 p-4 md:p-5">
            <div className="space-y-3">
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
                  <div key={wd} className="mb-1 text-[10px] font-bold uppercase text-outline">
                    {wd}
                  </div>
                ))}
                {calendarCells.map((cell) => (
                  <button
                    key={cell.ymd}
                    type="button"
                    onClick={() => handleSelectDate(cell.ymd)}
                    className={`min-w-0 px-0.5 py-1 text-sm sm:py-1.5 ${getCellClass(cell.ymd, cell.isCurrentMonth)}`}
                  >
                    {cell.date.getDate()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
