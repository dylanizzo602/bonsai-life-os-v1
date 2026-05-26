/* filterMigration: Convert legacy flat filter list to FilterRoot tree */

import type {
  FilterConditionLeaf,
  FilterNode,
  FilterRoot,
  LegacyFilterCondition,
} from '../types/filter'
import { newFilterId } from '../types/filter'

/** Flat list → root sibling list preserving combineWithPrevious */
export function migrateFlatConditionsToRoot(conditions: LegacyFilterCondition[]): FilterRoot {
  const children: FilterNode[] = conditions.map((c) => ({
    type: 'condition' as const,
    id: c.id,
    field: c.field,
    operator: c.operator,
    value: c.value,
    ...(c.combineWithPrevious ? { combineWithPrevious: c.combineWithPrevious } : {}),
  }))
  return { children }
}

/** Root → flat leaves only (for habit reminder subset evaluation) */
export function flattenToLegacyConditions(root: FilterRoot): LegacyFilterCondition[] {
  const out: LegacyFilterCondition[] = []
  const walk = (nodes: FilterNode[]) => {
    for (const node of nodes) {
      if (node.type === 'condition') {
        out.push({
          id: node.id,
          field: node.field,
          operator: node.operator,
          value: node.value,
          combineWithPrevious: node.combineWithPrevious,
        })
      } else {
        walk(node.children)
      }
    }
  }
  walk(root.children)
  return out
}

/** Available view default rules as FilterRoot */
export const AVAILABLE_DEFAULT_FILTER_ROOT: FilterRoot = migrateFlatConditionsToRoot([
  { id: 'av-status', field: 'status', operator: 'is_not', value: 'Complete' },
  { id: 'av-deps', field: 'dependencies', operator: 'doesnt_have', value: 'Waiting on' },
  { id: 'av-priority', field: 'priority', operator: 'is_not', value: 'none' },
  { id: 'av-start', field: 'start_date', operator: 'is', value: 'Now & earlier' },
])

/** All tasks default: not complete */
export const ALL_DEFAULT_FILTER_ROOT: FilterRoot = migrateFlatConditionsToRoot([
  { id: 'all-status', field: 'status', operator: 'is_not', value: 'Complete' },
])

/** Filter modal starting point when no custom filters are applied */
export const MODAL_DEFAULT_FILTER_ROOT: FilterRoot = migrateFlatConditionsToRoot([
  { id: 'modal-status', field: 'status', operator: 'is_not', value: 'Complete' },
])

export function createDefaultConditionLeaf(
  field = 'status',
  combineWithPrevious?: 'and' | 'or',
): FilterConditionLeaf {
  const operator = field === 'status' ? 'is' : 'is_set'
  const value = field === 'status' ? 'Open' : ''
  return {
    type: 'condition',
    id: newFilterId(),
    field,
    operator,
    value,
    ...(combineWithPrevious ? { combineWithPrevious } : {}),
  }
}

export function createDefaultGroup(combineWithPrevious?: 'and' | 'or'): import('../types/filter').FilterGroupNode {
  return {
    type: 'group',
    id: newFilterId(),
    children: [createDefaultConditionLeaf()],
    ...(combineWithPrevious ? { combineWithPrevious } : {}),
  }
}
