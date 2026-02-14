/* FilterModal: Modal for building task filters per plan (field, operator, criteria per field type) */

import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { CloseIcon } from '../../../components/icons'

export interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string
}

export interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  /** Saved views dropdown: load a view */
  savedViewIds?: { id: string; name: string }[]
  onLoadSavedView?: (id: string) => void
  /** Current filter conditions (flat list for v1) */
  conditions?: FilterCondition[]
  onConditionsChange?: (conditions: FilterCondition[]) => void
  onApply?: () => void
  /** Existing tag names for Tags criteria multi-select (plus "No tags" option) */
  availableTagNames?: string[]
}

/* Plan: Status – Open, In Progress, Closed. Operators: Is, Is not */
const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Closed', label: 'Closed' },
]

/* Plan: Priority – High, Medium, Low, None. Codebase also has Urgent. Operators: Is, Is not */
const PRIORITY_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
]

/* Plan: Task dependencies – Is blocking, Blocked, None. Operators: Is, Is not */
const DEPENDENCIES_OPTIONS = [
  { value: 'Blocked', label: 'Blocked' },
  { value: 'Is blocking', label: 'Is blocking' },
  { value: 'None', label: 'None' },
]

/* Plan: Recurring – Recurring / non-recurring */
const RECURRING_OPTIONS = [
  { value: 'Recurring', label: 'Recurring' },
  { value: 'Non-recurring', label: 'Non-recurring' },
]

/* Plan: Start date – Now or earlier, Later, Today, This week, Next week, Before/After date, Date range. Operators: Is, Is not, Before, After, Between, Is set, Is not set */
const START_DATE_OPTIONS = [
  { value: 'Now or earlier', label: 'Now or earlier' },
  { value: 'Later', label: 'Later' },
  { value: 'Today', label: 'Today' },
  { value: 'This week', label: 'This week' },
  { value: 'Next week', label: 'Next week' },
  { value: 'Is set', label: 'Is set' },
  { value: 'Is not set', label: 'Is not set' },
]

/* Plan: Due date – Today, Tomorrow, This week, Next week, Overdue, Before/After, Date range. Same operators as Start date */
const DUE_DATE_OPTIONS = [
  { value: 'Today', label: 'Today' },
  { value: 'Tomorrow', label: 'Tomorrow' },
  { value: 'This week', label: 'This week' },
  { value: 'Next week', label: 'Next week' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Is set', label: 'Is set' },
  { value: 'Is not set', label: 'Is not set' },
]

/* Field definitions with plan operators per field */
const FILTER_FIELDS: { id: string; label: string; operators: { id: string; label: string }[] }[] = [
  { id: 'status', label: 'Status', operators: [{ id: 'is', label: 'Is' }, { id: 'is_not', label: 'Is not' }] },
  {
    id: 'task_name',
    label: 'Task name',
    operators: [
      { id: 'contains', label: 'Contains' },
      { id: 'does_not_contain', label: 'Does not contain' },
      { id: 'starts_with', label: 'Starts with' },
      { id: 'ends_with', label: 'Ends with' },
      { id: 'is_exactly', label: 'Is exactly' },
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
  { id: 'priority', label: 'Priority', operators: [{ id: 'is', label: 'Is' }, { id: 'is_not', label: 'Is not' }] },
  {
    id: 'tags',
    label: 'Tags',
    operators: [
      { id: 'contains', label: 'Contains' },
      { id: 'does_not_contain', label: 'Does not contain' },
      { id: 'has_any_of', label: 'Has any of' },
      { id: 'has_all_of', label: 'Has all of' },
      { id: 'has_none', label: 'Has none' },
    ],
  },
  {
    id: 'dependencies',
    label: 'Task dependencies',
    operators: [{ id: 'is', label: 'Is' }, { id: 'is_not', label: 'Is not' }],
  },
  {
    id: 'recurring',
    label: 'Recurring',
    operators: [{ id: 'is', label: 'Is' }],
  },
  {
    id: 'time_estimate',
    label: 'Time estimates',
    operators: [
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
  if (fieldId === 'priority') return PRIORITY_OPTIONS[0].value
  if (fieldId === 'dependencies') return DEPENDENCIES_OPTIONS[0].value
  if (fieldId === 'recurring') return RECURRING_OPTIONS[0].value
  if (fieldId === 'start_date') {
    if (operator === 'before' || operator === 'after') return new Date().toISOString().slice(0, 10)
    return START_DATE_OPTIONS[0].value
  }
  if (fieldId === 'due_date') {
    if (operator === 'before' || operator === 'after') return new Date().toISOString().slice(0, 10)
    return DUE_DATE_OPTIONS[0].value
  }
  return ''
}

/**
 * Filter modal: Fields and operators per plan; criteria dropdown or input per field type.
 */
export function FilterModal({
  isOpen,
  onClose,
  savedViewIds = [],
  onLoadSavedView,
  conditions = [],
  onConditionsChange,
  onApply,
  availableTagNames = [],
}: FilterModalProps) {
  const [localConditions, setLocalConditions] = useState<FilterCondition[]>(conditions)

  useEffect(() => {
    if (isOpen) setLocalConditions(conditions)
  }, [isOpen, conditions])

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    const next = localConditions.map((c) => (c.id === id ? { ...c, ...patch } : c))
    setLocalConditions(next)
    onConditionsChange?.(next)
  }

  const handleAddFilter = () => {
    const next: FilterCondition = {
      id: crypto.randomUUID?.() ?? `f-${Date.now()}`,
      field: 'status',
      operator: 'is',
      value: 'Open',
    }
    const nextList = [...localConditions, next]
    setLocalConditions(nextList)
    onConditionsChange?.(nextList)
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

  const footer = (
    <>
      <button
        type="button"
        onClick={handleAddFilter}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-body font-medium text-bonsai-slate-700 bg-bonsai-slate-100 hover:bg-bonsai-slate-200"
      >
        + Add filter
      </button>
      <button
        type="button"
        onClick={handleClearAll}
        className="rounded-lg px-4 py-2 text-body font-medium text-red-600 hover:bg-red-50"
      >
        Clear all
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-4 py-2 text-body font-medium bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="rounded-lg px-4 py-2 text-body font-medium bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700"
      >
        Apply
      </button>
    </>
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
      return (
        <select
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          aria-label="Recurring value"
        >
          {RECURRING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (field === 'start_date') {
      if (operator === 'before' || operator === 'after') {
        const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10)
        return (
          <input
            type="date"
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
            value={dateValue}
            onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
            aria-label="Start date"
          />
        )
      }
      return (
        <select
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          aria-label="Start date value"
        >
          {START_DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (field === 'due_date') {
      if (operator === 'before' || operator === 'after') {
        const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10)
        return (
          <input
            type="date"
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
            value={dateValue}
            onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
            aria-label="Due date"
          />
        )
      }
      return (
        <select
          className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white min-w-[10rem]"
          value={value}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          aria-label="Due date value"
        >
          {DUE_DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (field === 'time_estimate') {
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
      if (operator === 'has_none') {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Filters" fullScreenOnMobile footer={footer}>
      {savedViewIds.length > 0 && onLoadSavedView && (
        <div className="mb-4">
          <select
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-secondary text-bonsai-slate-700 bg-white"
            aria-label="Load saved view"
            onChange={(e) => {
              const id = e.target.value
              if (id) onLoadSavedView(id)
              e.target.value = ''
            }}
          >
            <option value="">Saved views</option>
            {savedViewIds.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="text-secondary font-medium text-bonsai-slate-600">Where</div>
        {localConditions.length === 0 ? (
          <p className="text-secondary text-bonsai-slate-500">No filters. Add a filter below.</p>
        ) : (
          localConditions.map((cond) => (
            <div key={cond.id} className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white"
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
              <select
                className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white"
                value={cond.operator}
                onChange={(e) => {
                  const op = e.target.value
                  if (cond.field === 'start_date' || cond.field === 'due_date') {
                    updateCondition(cond.id, { operator: op, value: getDefaultValue(cond.field, op) })
                  } else if (cond.field === 'tags' && op === 'has_none') {
                    updateCondition(cond.id, { operator: op, value: '' })
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
              {renderCriteria(cond)}
              <button
                type="button"
                onClick={() => handleRemove(cond.id)}
                className="p-1.5 rounded-full text-bonsai-slate-500 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700"
                aria-label="Remove filter"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={handleAddFilter}
          className="text-body font-medium text-bonsai-sage-700 hover:underline text-left"
        >
          Add nested filter
        </button>
      </div>
    </Modal>
  )
}
