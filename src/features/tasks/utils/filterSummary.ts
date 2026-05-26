/* filterSummary: Human-readable chip labels + remove leaf from tree */

import type { FilterNode, FilterRoot } from '../types/filter'
import {
  DEPENDENCIES_OPTIONS,
  getFieldLabel,
  getOperatorLabel,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from './filterFields'
import { flattenConditionLeaves } from './filterEvaluation'

export interface FilterSummaryChip {
  id: string
  label: string
}

function formatCriteriaValue(field: string, operator: string, value: string): string {
  const v = (value ?? '').trim()
  if (!v && (operator === 'is_set' || operator === 'is_not_set' || operator.includes('recurring'))) {
    return ''
  }
  if (field === 'status') {
    return STATUS_OPTIONS.find((o) => o.value.toLowerCase() === v.toLowerCase())?.label ?? v
  }
  if (field === 'priority') {
    return PRIORITY_OPTIONS.find((o) => o.value.toLowerCase() === v.toLowerCase())?.label ?? v
  }
  if (field === 'dependencies') {
    return DEPENDENCIES_OPTIONS.find((o) => o.value.toLowerCase() === v.toLowerCase())?.label ?? v
  }
  if (field === 'tags') {
    const names = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (names.length === 0) return ''
    if (names.length === 1) return names[0]
    return names.slice(0, 2).join(', ') + (names.length > 2 ? '…' : '')
  }
  if (field === 'recurring') return ''
  return v.length > 24 ? `${v.slice(0, 22)}…` : v
}

/** Short chip label for one condition */
export function formatConditionChipLabel(
  field: string,
  operator: string,
  value: string,
): string {
  const fieldLabel = getFieldLabel(field)
  const opLabel = getOperatorLabel(field, operator)
  const criteria = formatCriteriaValue(field, operator, value)

  if (field === 'recurring') {
    return operator === 'is_recurring' ? 'Recurring' : 'Not recurring'
  }
  if (operator === 'is_set') return `${fieldLabel} is set`
  if (operator === 'is_not_set') return `${fieldLabel} is not set`
  if (field === 'dependencies') {
    return `${criteria} dependency`
  }
  if (!criteria) return `${fieldLabel} ${opLabel}`
  return `${criteria}`
}

export function buildFilterSummaryChips(root: FilterRoot): FilterSummaryChip[] {
  return flattenConditionLeaves(root).map((leaf) => ({
    id: leaf.id,
    label: formatConditionChipLabel(leaf.field, leaf.operator, leaf.value),
  }))
}

/** Remove a condition leaf by id from the tree (immutable) */
export function removeConditionFromRoot(root: FilterRoot, conditionId: string): FilterRoot {
  const prune = (nodes: FilterNode[]): FilterNode[] => {
    const next: FilterNode[] = []
    for (const node of nodes) {
      if (node.type === 'condition') {
        if (node.id !== conditionId) next.push(node)
      } else {
        const children = prune(node.children)
        if (children.length > 0) {
          next.push({ ...node, children })
        }
      }
    }
    return next
  }
  return { children: prune(root.children) }
}

/** Deep clone filter root */
export function cloneFilterRoot(root: FilterRoot): FilterRoot {
  return JSON.parse(JSON.stringify(root)) as FilterRoot
}
