/* FilterModal: Modal for building task filters per plan (field, operator, criteria per field type) */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../../../components/Modal'
import { PlusIcon } from '../../../components/icons'
import { MaterialIcon } from '../../../components/MaterialIcon'

export interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string
  /** How this condition combines with the previous one (first condition has none; default 'and'). */
  combineWithPrevious?: 'and' | 'or'
}

export interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  /** Current filter conditions (flat list for v1) */
  conditions?: FilterCondition[]
  onConditionsChange?: (conditions: FilterCondition[]) => void
  onApply?: () => void
  /** Existing tag names for Tags criteria multi-select (plus "No tags" option) */
  availableTagNames?: string[]
}

/* Plan: Status – Open, In Progress, Complete. Operators: Is, Is not */
const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Complete', label: 'Complete' },
]

/* Plan: Priority – None, Low, Normal (store as medium), High, Urgent. Operators: Is Set, Is Not Set, Is, Is not */
const PRIORITY_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Low', label: 'Low' },
  { value: 'medium', label: 'Normal' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
]

/* Plan: Task dependencies – Has / Doesn't Have. Values: Waiting on, Blocking, Any */
const DEPENDENCIES_OPTIONS = [
  { value: 'Waiting on', label: 'Waiting on' },
  { value: 'Blocking', label: 'Blocking' },
  { value: 'Any', label: 'Any' },
]

/* Shared date preset and picker options; start_date uses all except Overdue, due_date uses all */
const DATE_PRESET_OPTIONS: { value: string; label: string; dueOnly?: boolean }[] = [
  { value: 'Today', label: 'Today' },
  { value: 'Yesterday', label: 'Yesterday' },
  { value: 'Tomorrow', label: 'Tomorrow' },
  { value: 'Next 7 days', label: 'Next 7 days' },
  { value: 'Last 7 days', label: 'Last 7 days' },
  { value: 'This week', label: 'This week' },
  { value: 'Next week', label: 'Next week' },
  { value: 'Last week', label: 'Last week' },
  { value: 'Last month', label: 'Last month' },
  { value: 'This month', label: 'This month' },
  { value: 'Next year', label: 'Next year' },
  { value: 'Last year', label: 'Last year' },
  { value: 'Today & earlier', label: 'Today & earlier' },
  { value: 'Now & earlier', label: 'Now & earlier' },
  { value: 'Later than now', label: 'Later than now' },
  { value: 'Last quarter', label: 'Last quarter' },
  { value: 'This quarter', label: 'This quarter' },
  { value: 'Next quarter', label: 'Next quarter' },
  { value: 'Overdue', label: 'Overdue', dueOnly: true },
  { value: 'Any date', label: 'Any date' },
  { value: 'No date', label: 'No date' },
  { value: 'exact:', label: 'Exact date' },
  { value: 'before:', label: 'Before date' },
  { value: 'after:', label: 'After date' },
  { value: 'range:', label: 'Date range' },
]

function getStartDateOptions() {
  return DATE_PRESET_OPTIONS.filter((o) => !o.dueOnly)
}

function getDueDateOptions() {
  return DATE_PRESET_OPTIONS
}

/* Field definitions with plan operators per field */
const FILTER_FIELDS: { id: string; label: string; operators: { id: string; label: string }[] }[] = [
  { id: 'status', label: 'Status', operators: [{ id: 'is', label: 'Is' }, { id: 'is_not', label: 'Is not' }] },
  {
    id: 'task_name',
    label: 'Task name',
    operators: [
      { id: 'contains', label: 'Contains' },
      { id: 'does_not_contain', label: 'Does not contain' },
    ],
  },
  {
    id: 'start_date',
    label: 'Start date',
    operators: [
      { id: 'is', label: 'Is' },
      { id: 'is_not', label: 'Is not' },
      { id: 'before', label: 'Before' },
      { id: 'after', label: 'After' },
      { id: 'between', label: 'Between' },
      { id: 'is_set', label: 'Is set' },
      { id: 'is_not_set', label: 'Is not set' },
    ],
  },
  {
    id: 'due_date',
    label: 'Due date',
    operators: [
      { id: 'is', label: 'Is' },
      { id: 'is_not', label: 'Is not' },
      { id: 'before', label: 'Before' },
      { id: 'after', label: 'After' },
      { id: 'between', label: 'Between' },
      { id: 'is_set', label: 'Is set' },
      { id: 'is_not_set', label: 'Is not set' },
    ],
  },
  {
    id: 'priority',
    label: 'Priority',
    operators: [
      { id: 'is_set', label: 'Is set' },
      { id: 'is_not_set', label: 'Is not set' },
      { id: 'is', label: 'Is' },
      { id: 'is_not', label: 'Is not' },
    ],
  },
  {
    id: 'tags',
    label: 'Tags',
    operators: [
      { id: 'is_set', label: 'Is set' },
      { id: 'is_not_set', label: 'Is not set' },
      { id: 'is', label: 'Is' },
      { id: 'is_not', label: 'Is not' },
    ],
  },
  {
    id: 'dependencies',
    label: 'Task dependencies',
    operators: [
      { id: 'has', label: 'Has' },
      { id: 'doesnt_have', label: "Doesn't have" },
    ],
  },
  {
    id: 'recurring',
    label: 'Recurring',
    operators: [
      { id: 'is_recurring', label: 'Is recurring' },
      { id: 'is_not_recurring', label: 'Is not recurring' },
    ],
  },
  {
    id: 'time_estimate',
    label: 'Time estimates',
    operators: [
      { id: 'is_set', label: 'Is set' },
      { id: 'is_not_set', label: 'Is not set' },
      { id: 'greater_than', label: 'Greater than' },
      { id: 'less_than', label: 'Less than' },
      { id: 'equal_to', label: 'Equal to' },
    ],
  },
]

function getOperatorsForField(fieldId: string): { id: string; label: string }[] {
  return FILTER_FIELDS.find((f) => f.id === fieldId)?.operators ?? [{ id: 'is', label: 'Is' }]
}

function getDefaultOperator(fieldId: string): string {
  const ops = getOperatorsForField(fieldId)
  return ops[0]?.id ?? 'is'
}

function getDefaultValue(fieldId: string, operator?: string): string {
  if (fieldId === 'status') return STATUS_OPTIONS[0].value
  if (fieldId === 'priority') {
    if (operator === 'is_set' || operator === 'is_not_set') return ''
    return PRIORITY_OPTIONS[0].value
  }
  if (fieldId === 'time_estimate') {
    if (operator === 'is_set' || operator === 'is_not_set') return ''
    return ''
  }
  if (fieldId === 'tags') {
    if (operator === 'is_set' || operator === 'is_not_set') return ''
    return ''
  }
  if (fieldId === 'dependencies') return DEPENDENCIES_OPTIONS[0].value
  if (fieldId === 'recurring') return ''
  if (fieldId === 'start_date') {
    const today = new Date().toISOString().slice(0, 10)
    if (operator === 'before' || operator === 'after') return today
    return getStartDateOptions()[0].value
  }
  if (fieldId === 'due_date') {
    const today = new Date().toISOString().slice(0, 10)
    if (operator === 'before' || operator === 'after') return today
    return getDueDateOptions()[0].value
  }
  return ''
}

/**
 * Filter modal: Fields and operators per plan; criteria dropdown or input per field type.
 */
export function FilterModal({
  isOpen,
  onClose,
  conditions = [],
  onConditionsChange,
  onApply,
  availableTagNames = [],
}: FilterModalProps) {
  const [localConditions, setLocalConditions] = useState<FilterCondition[]>(conditions)
  /* Global combine toggle: AND/OR (v1 maps to combineWithPrevious for all conditions after the first). */
  const [combineMode, setCombineMode] = useState<'and' | 'or'>('and')
  /* Add filter popover: open state, refs, and position (like Sort modal "Add sort" popover) */
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false)
  const addFilterButtonRef = useRef<HTMLButtonElement>(null)
  const addFilterPopoverRef = useRef<HTMLDivElement>(null)
  const [addFilterPopoverPosition, setAddFilterPopoverPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen) return
    setLocalConditions(conditions)
    const hasOr = conditions.slice(1).some((c) => (c.combineWithPrevious ?? 'and') === 'or')
    setCombineMode(hasOr ? 'or' : 'and')
  }, [isOpen, conditions])

  /* Keep global combine mode in sync when user edits local conditions. */
  useEffect(() => {
    const hasOr = localConditions.slice(1).some((c) => (c.combineWithPrevious ?? 'and') === 'or')
    setCombineMode(hasOr ? 'or' : 'and')
  }, [localConditions])

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    const next = localConditions.map((c) => (c.id === id ? { ...c, ...patch } : c))
    setLocalConditions(next)
    onConditionsChange?.(next)
  }

  /* Apply combine mode across the whole flat list (v1 behavior; nested rules are future). */
  const applyCombineMode = (mode: 'and' | 'or') => {
    setCombineMode(mode)
    const next = localConditions.map((c, idx) =>
      idx === 0 ? c : { ...c, combineWithPrevious: mode },
    )
    setLocalConditions(next)
    onConditionsChange?.(next)
  }

  /* Add a new filter condition for the chosen field; close popover after adding */
  const handleAddFilterWithField = (fieldId: string) => {
    const operator = getDefaultOperator(fieldId)
    const value = getDefaultValue(fieldId, operator)
    const next: FilterCondition = {
      id: crypto.randomUUID?.() ?? `f-${Date.now()}`,
      field: fieldId,
      operator,
      value,
      ...(localConditions.length > 0 ? { combineWithPrevious: combineMode } : {}),
    }
    const nextList = [...localConditions, next]
    setLocalConditions(nextList)
    onConditionsChange?.(nextList)
    setIsAddFilterPopoverOpen(false)
  }

  const handleRemove = (id: string) => {
    const next = localConditions.filter((c) => c.id !== id)
    setLocalConditions(next)
    onConditionsChange?.(next)
  }

  const handleFieldChange = (cond: FilterCondition, newFieldId: string) => {
    const newOperator = getDefaultOperator(newFieldId)
    const newValue = getDefaultValue(newFieldId, newOperator)
    updateCondition(cond.id, { field: newFieldId, operator: newOperator, value: newValue })
  }

  const handleClearAll = () => {
    setLocalConditions([])
    onConditionsChange?.([])
  }

  const handleApply = () => {
    onConditionsChange?.(localConditions)
    onApply?.()
    onClose()
  }

  /* Position add-filter popover: below button on desktop, centered on mobile (match Sort modal) */
  useEffect(() => {
    if (!isAddFilterPopoverOpen || !addFilterPopoverRef.current || !addFilterButtonRef.current) return
    const updatePosition = () => {
      if (!addFilterPopoverRef.current || !addFilterButtonRef.current) return
      const popoverRect = addFilterPopoverRef.current.getBoundingClientRect()
      const buttonRect = addFilterButtonRef.current.getBoundingClientRect()
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const DESKTOP_BREAKPOINT = 1024
      let top: number
      let left: number
      if (viewportWidth < DESKTOP_BREAKPOINT) {
        top = Math.max(padding, (viewportHeight - popoverRect.height) / 2)
        left = Math.max(padding, (viewportWidth - popoverRect.width) / 2)
      } else {
        top = buttonRect.bottom + 4
        left = buttonRect.left
        if (left + popoverRect.width > viewportWidth - padding) left = viewportWidth - popoverRect.width - padding
        if (left < padding) left = padding
        if (top + popoverRect.height > viewportHeight - padding) top = buttonRect.top - popoverRect.height - 4
        if (top < padding) top = padding
      }
      setAddFilterPopoverPosition({ top, left })
    }
    const t = setTimeout(updatePosition, 0)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isAddFilterPopoverOpen])

  /* Close add-filter popover when clicking outside */
  useEffect(() => {
    if (!isAddFilterPopoverOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addFilterPopoverRef.current && !addFilterPopoverRef.current.contains(e.target as Node) &&
        addFilterButtonRef.current && !addFilterButtonRef.current.contains(e.target as Node)
      ) {
        setIsAddFilterPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isAddFilterPopoverOpen])

  /* Close add-filter popover when modal closes */
  useEffect(() => {
    if (!isOpen) setIsAddFilterPopoverOpen(false)
  }, [isOpen])

  /* Title node: custom header content; Modal still renders its built-in close button. */
  const titleNode = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bonsai-sage-100">
          <MaterialIcon name="filter_list" className="text-[20px] text-bonsai-sage-700" />
        </div>
        <span className="text-body font-semibold text-bonsai-brown-700">Filter Rules</span>
      </div>
    ),
    [],
  )

  /* Add-filter popover: list of available filter fields (desktop + mobile). */
  const addFilterPopover =
    isAddFilterPopoverOpen &&
    createPortal(
      <div
        ref={addFilterPopoverRef}
        className="fixed z-[10000] flex max-h-[calc(100vh-16px)] min-h-0 flex-col overflow-hidden rounded-xl border border-bonsai-slate-200 bg-white shadow-lg"
        style={{
          top: `${addFilterPopoverPosition.top}px`,
          left: `${addFilterPopoverPosition.left}px`,
        }}
        role="menu"
        aria-label="Add filter field"
      >
        <div className="flex min-w-[220px] flex-col gap-1 p-2">
          {FILTER_FIELDS.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => handleAddFilterWithField(field.id)}
              className="flex items-center rounded-lg px-3 py-2 text-body font-medium text-bonsai-slate-800 transition-colors hover:bg-bonsai-slate-50 text-left"
              role="menuitem"
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>,
      document.body,
    )

  const renderCriteria = (cond: FilterCondition) => {
    const { field, operator, value } = cond
    if (field === 'status') {
      return (
        <select
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          aria-label="Status value"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (field === 'priority') {
      if (operator === 'is_set' || operator === 'is_not_set') {
        return <span className="text-secondary text-bonsai-slate-500">—</span>
      }
      return (
        <select
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          aria-label="Priority value"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (field === 'dependencies') {
      return (
        <select
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          aria-label="Dependencies value"
        >
          {DEPENDENCIES_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (field === 'recurring') {
      return <span className="text-secondary text-bonsai-slate-500">—</span>
    }
    /* start_date: one dropdown (presets + Exact/Before/After/Range); date input(s) when picker type selected */
    if (field === 'start_date') {
      const options = getStartDateOptions()
      const selectedKey =
        value.startsWith('exact:') ? 'exact:' : value.startsWith('before:') ? 'before:' : value.startsWith('after:') ? 'after:' : value.startsWith('range:') ? 'range:' : value
      const today = new Date().toISOString().slice(0, 10)
      const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value
        if (v === 'exact:' || v === 'before:' || v === 'after:') updateCondition(cond.id, { value: `${v}${today}` })
        else if (v === 'range:') updateCondition(cond.id, { value: `range:${today}:${today}` })
        else updateCondition(cond.id, { value: v })
      }
      const dateInput = (prefix: string, ariaLabel: string) => {
        const datePart = value.startsWith(prefix) ? value.slice(prefix.length).split(':')[0] || today : today
        return (
          <input
            type="date"
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
            value={/^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : today}
            onChange={(e) => updateCondition(cond.id, { value: `${prefix}${e.target.value}` })}
            aria-label={ariaLabel}
          />
        )
      }
      const rangeInputs = () => {
        const parts = value.startsWith('range:') ? value.slice(6).split(':') : []
        const startPart = parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts[0] : today
        const endPart = parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? parts[1] : today
        return (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
              value={startPart}
              onChange={(e) => updateCondition(cond.id, { value: `range:${e.target.value}:${endPart}` })}
              aria-label="Range start"
            />
            <input
              type="date"
              className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
              value={endPart}
              onChange={(e) => updateCondition(cond.id, { value: `range:${startPart}:${e.target.value}` })}
              aria-label="Range end"
            />
          </div>
        )
      }
      return (
        <div className="flex flex-col gap-2">
          <select
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
            value={options.some((o) => o.value === selectedKey) ? selectedKey : options[0].value}
            onChange={handlePresetChange}
            aria-label="Start date preset or type"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(selectedKey === 'exact:' || selectedKey === 'before:' || selectedKey === 'after:') && dateInput(selectedKey, 'Start date')}
          {selectedKey === 'range:' && rangeInputs()}
        </div>
      )
    }
    /* due_date: same as start_date but with Overdue option */
    if (field === 'due_date') {
      const options = getDueDateOptions()
      const selectedKey =
        value.startsWith('exact:') ? 'exact:' : value.startsWith('before:') ? 'before:' : value.startsWith('after:') ? 'after:' : value.startsWith('range:') ? 'range:' : value
      const today = new Date().toISOString().slice(0, 10)
      const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value
        if (v === 'exact:' || v === 'before:' || v === 'after:') updateCondition(cond.id, { value: `${v}${today}` })
        else if (v === 'range:') updateCondition(cond.id, { value: `range:${today}:${today}` })
        else updateCondition(cond.id, { value: v })
      }
      const dateInput = (prefix: string, ariaLabel: string) => {
        const datePart = value.startsWith(prefix) ? value.slice(prefix.length).split(':')[0] || today : today
        return (
          <input
            type="date"
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
            value={/^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : today}
            onChange={(e) => updateCondition(cond.id, { value: `${prefix}${e.target.value}` })}
            aria-label={ariaLabel}
          />
        )
      }
      const rangeInputs = () => {
        const parts = value.startsWith('range:') ? value.slice(6).split(':') : []
        const startPart = parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts[0] : today
        const endPart = parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? parts[1] : today
        return (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
              value={startPart}
              onChange={(e) => updateCondition(cond.id, { value: `range:${e.target.value}:${endPart}` })}
              aria-label="Range start"
            />
            <input
              type="date"
              className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
              value={endPart}
              onChange={(e) => updateCondition(cond.id, { value: `range:${startPart}:${e.target.value}` })}
              aria-label="Range end"
            />
          </div>
        )
      }
      return (
        <div className="flex flex-col gap-2">
          <select
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
            value={options.some((o) => o.value === selectedKey) ? selectedKey : options[0].value}
            onChange={handlePresetChange}
            aria-label="Due date preset or type"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(selectedKey === 'exact:' || selectedKey === 'before:' || selectedKey === 'after:') && dateInput(selectedKey, 'Due date')}
          {selectedKey === 'range:' && rangeInputs()}
        </div>
      )
    }
    if (field === 'time_estimate') {
      if (operator === 'is_set' || operator === 'is_not_set') {
        return <span className="text-secondary text-bonsai-slate-500">—</span>
      }
      return (
        <input
          type="number"
          min={0}
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white w-24"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          placeholder="Minutes"
          aria-label="Time estimate (minutes)"
        />
      )
    }
    if (field === 'tags') {
      if (operator === 'is_set' || operator === 'is_not_set') {
        return <span className="text-secondary text-bonsai-slate-500">—</span>
      }
      const options = ['No tags', ...(availableTagNames ?? [])]
      const selectedSet = new Set(
        (value ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
      const toggleTag = (name: string) => {
        const next = new Set(selectedSet)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        updateCondition(cond.id, { value: Array.from(next).join(', ') })
      }
      if (options.length <= 1) {
        return (
          <input
            type="text"
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white w-40"
            value={value}
            onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
            placeholder="Tag name"
            aria-label="Tag value"
          />
        )
      }
      return (
        <div className="flex flex-col gap-1.5 rounded-lg border border-bonsai-slate-300 bg-bonsai-slate-50/50 p-2 max-h-48 overflow-y-auto min-w-[10rem]" role="group" aria-label="Select tags">
          {options.map((name) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer text-body text-bonsai-slate-700 hover:bg-bonsai-slate-100 rounded px-2 py-1.5">
              <input
                type="checkbox"
                checked={selectedSet.has(name)}
                onChange={() => toggleTag(name)}
                className="rounded border-bonsai-slate-300 text-bonsai-sage-600 focus:ring-bonsai-sage-500"
                aria-label={name}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      )
    }
    /* task_name: text input */
    return (
      <input
        type="text"
        className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white w-40"
        value={value}
        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
        placeholder="Task name"
        aria-label="Task name value"
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleNode} fullScreenOnMobile disableBodyScroll>
      <div className="flex flex-col gap-6">
        {/* AND/OR toggle: controls how rules combine (flat list v1). */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex w-fit items-center rounded-lg bg-bonsai-slate-100 p-1">
            <button
              type="button"
              onClick={() => applyCombineMode('and')}
              className={
                combineMode === 'and'
                  ? 'rounded-md bg-white px-4 py-1.5 text-secondary font-bold uppercase tracking-wider text-bonsai-sage-700 shadow-sm'
                  : 'rounded-md px-4 py-1.5 text-secondary font-bold uppercase tracking-wider text-bonsai-slate-600 hover:bg-bonsai-slate-200'
              }
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => applyCombineMode('or')}
              className={
                combineMode === 'or'
                  ? 'rounded-md bg-white px-4 py-1.5 text-secondary font-bold uppercase tracking-wider text-bonsai-sage-700 shadow-sm'
                  : 'rounded-md px-4 py-1.5 text-secondary font-bold uppercase tracking-wider text-bonsai-slate-600 hover:bg-bonsai-slate-200'
              }
            >
              OR
            </button>
          </div>

          {/* Nested rules: future enhancement (v1 is flat list). */}
          <button
            type="button"
            disabled
            className="ml-auto inline-flex items-center gap-1 text-secondary font-semibold text-bonsai-sage-700/60"
            title="Nested rules coming soon"
          >
            <MaterialIcon name="add" className="text-[18px]" />
            + Add a nested filter rule
          </button>
        </div>

        {/* Rules list: each row is a 3-column grid with hover-delete. */}
        <div className="flex flex-col gap-3">
          {localConditions.length === 0 ? (
            <p className="text-secondary text-bonsai-slate-500">No filters yet. Add one below.</p>
          ) : (
            localConditions.map((cond) => (
              <div
                key={cond.id}
                className="group flex items-center gap-3 rounded-lg border border-bonsai-slate-200 bg-white p-3"
              >
                <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-t-sm border-0 border-b border-bonsai-slate-200 bg-white py-2 pl-3 pr-8 text-secondary text-bonsai-slate-700 transition-colors focus:border-bonsai-sage-600 focus:ring-0"
                      value={cond.field}
                      onChange={(e) => handleFieldChange(cond, e.target.value)}
                      aria-label="Filter field"
                    >
                      {FILTER_FIELDS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-bonsai-slate-400">
                      <MaterialIcon name="expand_more" className="text-[18px]" />
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-t-sm border-0 border-b border-bonsai-slate-200 bg-white py-2 pl-3 pr-8 text-secondary text-bonsai-slate-700 transition-colors focus:border-bonsai-sage-600 focus:ring-0"
                      value={cond.operator}
                      onChange={(e) => {
                        const op = e.target.value
                        if (cond.field === 'start_date' || cond.field === 'due_date') {
                          updateCondition(cond.id, {
                            operator: op,
                            value: getDefaultValue(cond.field, op),
                          })
                        } else {
                          updateCondition(cond.id, { operator: op })
                        }
                      }}
                      aria-label="Operator"
                    >
                      {getOperatorsForField(cond.field).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-bonsai-slate-400">
                      <MaterialIcon name="expand_more" className="text-[18px]" />
                    </span>
                  </div>

                  <div className="min-w-0">{renderCriteria(cond)}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(cond.id)}
                  className="p-1 text-bonsai-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  aria-label="Remove filter rule"
                >
                  <MaterialIcon name="delete" className="text-[22px]" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add rule: button + popover for choosing field. */}
        <div className="relative">
          <button
            ref={addFilterButtonRef}
            type="button"
            onClick={() => setIsAddFilterPopoverOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-body font-semibold text-bonsai-sage-700 transition-colors hover:text-bonsai-sage-800"
            aria-expanded={isAddFilterPopoverOpen}
            aria-haspopup="true"
          >
            <PlusIcon className="h-5 w-5" />
            <span>+ Add</span>
          </button>
          {addFilterPopover}
        </div>

        {/* Footer actions: Clear, Cancel, Apply. */}
        <div className="flex items-center justify-between gap-3 border-t border-bonsai-slate-200 pt-4">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-body font-medium text-bonsai-slate-600 hover:text-red-600"
          >
            Clear All
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-6 py-2.5 text-body font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-bonsai-sage-600 px-8 py-2.5 text-body font-semibold text-white hover:bg-bonsai-sage-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
