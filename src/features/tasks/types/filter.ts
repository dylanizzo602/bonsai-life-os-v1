/* filter: Nested filter tree (ClickUp-style mixed AND/OR + groups) */

export type FilterCombine = 'and' | 'or'

/** Leaf: field + operator + criteria */
export interface FilterConditionLeaf {
  type: 'condition'
  id: string
  field: string
  operator: string
  value: string
  /** How this node combines with the previous sibling (first has none). */
  combineWithPrevious?: FilterCombine
}

/** Nested group of filter nodes */
export interface FilterGroupNode {
  type: 'group'
  id: string
  children: FilterNode[]
  combineWithPrevious?: FilterCombine
}

export type FilterNode = FilterConditionLeaf | FilterGroupNode

/** Root filter tree (ordered sibling list, no global combine flag) */
export interface FilterRoot {
  children: FilterNode[]
}

/** Legacy flat condition (migration only) */
export interface LegacyFilterCondition {
  id: string
  field: string
  operator: string
  value: string
  combineWithPrevious?: FilterCombine
}

export function newFilterId(): string {
  return crypto.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyFilterRoot(): FilterRoot {
  return { children: [] }
}

export function isFilterGroupNode(node: FilterNode): node is FilterGroupNode {
  return node.type === 'group'
}

export function isFilterConditionNode(node: FilterNode): node is FilterConditionLeaf {
  return node.type === 'condition'
}
