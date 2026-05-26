/* filterFields: Bonsai task filter field catalog (ClickUp-aligned, existing Task columns only) */

export const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Complete', label: 'Complete' },
  { value: 'Archived', label: 'Archived' },
]

export const PRIORITY_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Low', label: 'Low' },
  { value: 'medium', label: 'Normal' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
]

export const DEPENDENCIES_OPTIONS = [
  { value: 'Waiting on', label: 'Waiting on' },
  { value: 'Blocking', label: 'Blocking' },
  { value: 'Any', label: 'Any' },
]

export const DATE_PRESET_OPTIONS: { value: string; label: string; dueOnly?: boolean }[] = [
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

export const DATE_FIELD_IDS = [
  'start_date',
  'due_date',
  'created_at',
  'updated_at',
  'completed_at',
] as const

export type DateFieldId = (typeof DATE_FIELD_IDS)[number]

export function isDateFieldId(fieldId: string): fieldId is DateFieldId {
  return (DATE_FIELD_IDS as readonly string[]).includes(fieldId)
}

export function getStartDatePresetOptions() {
  return DATE_PRESET_OPTIONS.filter((o) => !o.dueOnly)
}

export function getDueDatePresetOptions() {
  return DATE_PRESET_OPTIONS
}

export interface FilterFieldDef {
  id: string
  label: string
  operators: { id: string; label: string }[]
}

export const FILTER_FIELDS: FilterFieldDef[] = [
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
    id: 'created_at',
    label: 'Date created',
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
    id: 'updated_at',
    label: 'Date updated',
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
    id: 'completed_at',
    label: 'Date closed',
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

export function getOperatorsForField(fieldId: string) {
  return FILTER_FIELDS.find((f) => f.id === fieldId)?.operators ?? [{ id: 'is', label: 'Is' }]
}

export function getFieldLabel(fieldId: string): string {
  return FILTER_FIELDS.find((f) => f.id === fieldId)?.label ?? fieldId
}

export function getOperatorLabel(fieldId: string, operatorId: string): string {
  return getOperatorsForField(fieldId).find((o) => o.id === operatorId)?.label ?? operatorId
}

export function getDefaultOperator(fieldId: string): string {
  return getOperatorsForField(fieldId)[0]?.id ?? 'is'
}

export function getDefaultValue(fieldId: string, operator?: string): string {
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
  if (isDateFieldId(fieldId)) {
    const today = new Date().toISOString().slice(0, 10)
    if (operator === 'before' || operator === 'after') return today
    const opts = fieldId === 'due_date' ? getDueDatePresetOptions() : getStartDatePresetOptions()
    return opts[0]?.value ?? 'Today'
  }
  return ''
}

export function getDatePresetOptionsForField(fieldId: string) {
  if (fieldId === 'due_date') return getDueDatePresetOptions()
  return getStartDatePresetOptions()
}

/** Max nesting depth for filter groups (root = 0) */
export const FILTER_MAX_GROUP_DEPTH = 3
