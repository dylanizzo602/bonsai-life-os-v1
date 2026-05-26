/* FilterCriteriaEditor: Criteria control for one filter condition row */

import {
  DEPENDENCIES_OPTIONS,
  getDatePresetOptionsForField,
  isDateFieldId,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '../../utils/filterFields'

const selectClass =
  'w-full appearance-none rounded-t-sm border-0 border-b border-bonsai-slate-200 bg-white py-2 pl-3 pr-8 text-secondary text-bonsai-slate-700 transition-colors focus:border-bonsai-sage-600 focus:ring-0 min-w-0'

const inlineInputClass =
  'w-full rounded-t-sm border-0 border-b border-bonsai-slate-200 bg-white py-2 pl-3 pr-3 text-secondary text-bonsai-slate-700 focus:border-bonsai-sage-600 focus:ring-0'

interface FilterCriteriaEditorProps {
  field: string
  operator: string
  value: string
  onValueChange: (value: string) => void
  availableTagNames?: string[]
}

/**
 * Renders criteria input(s) for a filter row based on field and operator.
 */
export function FilterCriteriaEditor({
  field,
  operator,
  value,
  onValueChange,
  availableTagNames = [],
}: FilterCriteriaEditorProps) {
  if (field === 'status') {
    return (
      <select className={selectClass} value={value} onChange={(e) => onValueChange(e.target.value)} aria-label="Status value">
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
      <select className={selectClass} value={value} onChange={(e) => onValueChange(e.target.value)} aria-label="Priority value">
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
      <select className={selectClass} value={value} onChange={(e) => onValueChange(e.target.value)} aria-label="Dependencies value">
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

  if (isDateFieldId(field)) {
    const options = getDatePresetOptionsForField(field)
    const selectedKey =
      value.startsWith('exact:')
        ? 'exact:'
        : value.startsWith('before:')
          ? 'before:'
          : value.startsWith('after:')
            ? 'after:'
            : value.startsWith('range:')
              ? 'range:'
              : value
    const today = new Date().toISOString().slice(0, 10)
    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value
      if (v === 'exact:' || v === 'before:' || v === 'after:') onValueChange(`${v}${today}`)
      else if (v === 'range:') onValueChange(`range:${today}:${today}`)
      else onValueChange(v)
    }
    const dateInput = (prefix: string, ariaLabel: string) => {
      const datePart = value.startsWith(prefix) ? value.slice(prefix.length).split(':')[0] || today : today
      return (
        <input
          type="date"
          className={inlineInputClass}
          value={/^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : today}
          onChange={(e) => onValueChange(`${prefix}${e.target.value}`)}
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
            className={inlineInputClass}
            value={startPart}
            onChange={(e) => onValueChange(`range:${e.target.value}:${endPart}`)}
            aria-label="Range start"
          />
          <input
            type="date"
            className={inlineInputClass}
            value={endPart}
            onChange={(e) => onValueChange(`range:${startPart}:${e.target.value}`)}
            aria-label="Range end"
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-2 min-w-0">
        <select
          className={selectClass}
          value={options.some((o) => o.value === selectedKey) ? selectedKey : options[0]?.value}
          onChange={handlePresetChange}
          aria-label="Date preset or type"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {(selectedKey === 'exact:' || selectedKey === 'before:' || selectedKey === 'after:') &&
          dateInput(selectedKey, 'Date')}
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
        className={inlineInputClass}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Minutes"
        aria-label="Time estimate (minutes)"
      />
    )
  }

  if (field === 'tags') {
    if (operator === 'is_set' || operator === 'is_not_set') {
      return <span className="text-secondary text-bonsai-slate-500">—</span>
    }
    const options = ['No tags', ...availableTagNames]
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
      onValueChange(Array.from(next).join(', '))
    }
    if (options.length <= 1) {
      return (
        <input
          type="text"
          className={inlineInputClass}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Tag name"
          aria-label="Tag value"
        />
      )
    }
    return (
      <div
        className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-2 min-w-0"
        role="group"
        aria-label="Select tags"
      >
        {options.map((name) => (
          <label
            key={name}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-body text-bonsai-slate-700 hover:bg-bonsai-slate-100"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(name)}
              onChange={() => toggleTag(name)}
              className="rounded border-bonsai-slate-300 text-bonsai-sage-600"
            />
            <span>{name}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <input
      type="text"
      className={inlineInputClass}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder="Task name"
      aria-label="Task name value"
    />
  )
}
