/* TimePickerModal: Custom time picker popover with hours, minutes, AM/PM columns */

import { useEffect, useRef, useState } from 'react'

export interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  /** Value in 24h format HH:mm (e.g. "16:00" for 4 PM) */
  value: string
  onChange: (value: string) => void
  /** Reference to the trigger element for popover positioning */
  triggerRef: React.RefObject<HTMLElement | null>
  /** Aria label for the time picker */
  ariaLabel?: string
}

/** Parse HH:mm (24h) to { hour12, minute, ampm } for display */
function parseTime24(value: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!value || !value.includes(':')) {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const hour12 = h % 12 || 12
    return { hour12, minute: m, ampm: h < 12 ? 'AM' : 'PM' }
  }
  const [hStr, mStr] = value.split(':')
  const h = parseInt(hStr ?? '12', 10)
  const m = parseInt(mStr ?? '0', 10)
  const hour12 = h % 12 || 12
  const ampm: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM'
  return { hour12, minute: Math.min(59, Math.max(0, m)), ampm }
}

/** Build HH:mm (24h) from hour12, minute, ampm */
function toTime24(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h = hour12
  if (ampm === 'PM' && hour12 !== 12) h += 12
  if (ampm === 'AM' && hour12 === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const AMPM_OPTIONS: ('AM' | 'PM')[] = ['AM', 'PM']

/**
 * Single scrollable column for time picker
 */
function TimeColumn<T>({
  options,
  selected,
  onSelect,
  format = (v) => String(v).padStart(2, '0'),
}: {
  options: T[]
  selected: T
  onSelect: (v: T) => void
  format?: (v: T) => string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  /* Scroll selected item into view when popover opens */
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [selected])

  return (
    <div
      ref={listRef}
      className="flex flex-col overflow-y-auto max-h-[12rem] min-w-[2.5rem] border-r border-bonsai-slate-200 last:border-r-0"
    >
      {options.map((opt) => {
        const isSelected = opt === selected
        return (
          <button
            key={String(opt)}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(opt)}
            className={`px-3 py-2 text-secondary text-center transition-colors ${
              isSelected
                ? 'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700'
                : 'text-bonsai-slate-700 hover:bg-bonsai-slate-100'
            }`}
          >
            {format(opt)}
          </button>
        )
      })}
    </div>
  )
}

export function TimePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
  triggerRef,
  ariaLabel = 'Select time',
}: TimePickerModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const parsed = parseTime24(value)

  /* Local state: keep in sync with value when open */
  const [hour12, setHour12] = useState(parsed.hour12)
  const [minute, setMinute] = useState(parsed.minute)
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(parsed.ampm)

  /* Sync local state when modal opens or value changes */
  useEffect(() => {
    if (isOpen) {
      const p = parseTime24(value)
      setHour12(p.hour12)
      setMinute(p.minute)
      setAmpm(p.ampm)
    }
  }, [isOpen, value])

  /* Apply selection: convert to 24h and notify parent */
  const applySelection = (h: number, m: number, a: 'AM' | 'PM') => {
    const newValue = toTime24(h, m, a)
    onChange(newValue)
  }

  /* Position popover below trigger with viewport boundary detection */
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return
    const updatePosition = () => {
      if (!triggerRef.current || !popoverRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      let top = triggerRect.bottom + 4
      let left = triggerRect.left
      if (left + popoverRect.width > viewportWidth - padding) left = viewportWidth - popoverRect.width - padding
      if (left < padding) left = padding
      if (top + popoverRect.height > viewportHeight - padding) top = triggerRect.top - popoverRect.height - 4
      if (top < padding) top = padding
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

  /* Handle hour change: update local state and notify parent */
  const handleHourSelect = (h: number) => {
    setHour12(h)
    applySelection(h, minute, ampm)
  }

  /* Handle minute change: update local state and notify parent */
  const handleMinuteSelect = (m: number) => {
    setMinute(m)
    applySelection(hour12, m, ampm)
  }

  /* Handle AM/PM change: update local state and notify parent */
  const handleAmpmSelect = (a: 'AM' | 'PM') => {
    setAmpm(a)
    applySelection(hour12, minute, a)
  }

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="fixed z-[60] flex rounded-lg border border-bonsai-slate-200 bg-white shadow-xl overflow-hidden"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-label={ariaLabel}
    >
      <TimeColumn options={HOURS} selected={hour12} onSelect={handleHourSelect} format={(v) => String(v)} />
      <TimeColumn options={MINUTES} selected={minute} onSelect={handleMinuteSelect} />
      <TimeColumn options={AMPM_OPTIONS} selected={ampm} onSelect={handleAmpmSelect} />
    </div>
  )
}
