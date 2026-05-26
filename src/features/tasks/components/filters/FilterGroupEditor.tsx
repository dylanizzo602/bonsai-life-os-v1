/* FilterGroupEditor: Filter rule rows with per-line And/Or; add row appends an editable line */

import { MaterialIcon } from '../../../../components/MaterialIcon'
import { PlusIcon } from '../../../../components/icons'
import type { FilterCombine, FilterConditionLeaf, FilterNode } from '../../types/filter'
import {
  FILTER_FIELDS,
  getDefaultOperator,
  getDefaultValue,
  getOperatorsForField,
} from '../../utils/filterFields'
import { createDefaultConditionLeaf } from '../../utils/filterMigration'
import { FilterCriteriaEditor } from './FilterCriteriaEditor'

interface FilterGroupEditorProps {
  nodes: FilterNode[]
  depth: number
  onNodesChange: (nodes: FilterNode[]) => void
  availableTagNames?: string[]
}

function CombineToggle({
  value,
  onChange,
}: {
  value: FilterCombine
  onChange: (v: FilterCombine) => void
}) {
  return (
    <div className="flex w-fit shrink-0 items-center rounded-lg bg-bonsai-slate-100 p-0.5">
      <button
        type="button"
        onClick={() => onChange('and')}
        className={
          value === 'and'
            ? 'rounded-md bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bonsai-sage-700 shadow-sm'
            : 'rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bonsai-slate-600 hover:bg-bonsai-slate-200'
        }
      >
        And
      </button>
      <button
        type="button"
        onClick={() => onChange('or')}
        className={
          value === 'or'
            ? 'rounded-md bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bonsai-sage-700 shadow-sm'
            : 'rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bonsai-slate-600 hover:bg-bonsai-slate-200'
        }
      >
        Or
      </button>
    </div>
  )
}

/**
 * Editable filter list: each "+ Add new filter" appends a row (default And with previous).
 */
export function FilterGroupEditor({
  nodes,
  depth,
  onNodesChange,
  availableTagNames = [],
}: FilterGroupEditorProps) {
  const updateNodeAt = (index: number, patch: Partial<FilterConditionLeaf> | FilterNode) => {
    const next = nodes.map((n, i) => {
      if (i !== index) return n
      if (n.type === 'condition' && 'field' in patch) {
        return { ...n, ...patch } as FilterConditionLeaf
      }
      if (n.type === 'group' && patch.type === 'group') {
        return patch
      }
      return n
    })
    onNodesChange(next)
  }

  const removeAt = (index: number) => {
    onNodesChange(nodes.filter((_, i) => i !== index))
  }

  const setCombineAt = (index: number, combine: FilterCombine) => {
    const next = nodes.map((n, i) => (i === index ? { ...n, combineWithPrevious: combine } : n))
    onNodesChange(next)
  }

  /* Append a new blank rule row; user picks field/operator/criteria on the row */
  const addNewFilterLine = () => {
    const leaf = createDefaultConditionLeaf('status', nodes.length > 0 ? 'and' : undefined)
    leaf.operator = getDefaultOperator(leaf.field)
    leaf.value = getDefaultValue(leaf.field, leaf.operator)
    onNodesChange([...nodes, leaf])
  }

  return (
    <div className={`flex flex-col gap-3 ${depth > 0 ? 'rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/80 p-3' : ''}`}>
      {nodes.length === 0 && depth === 0 ? (
        <p className="text-secondary text-bonsai-slate-500">No filters yet. Add one below.</p>
      ) : null}

      {nodes.map((node, index) => (
        <div key={node.id} className="flex flex-col gap-2">
          {index > 0 ? (
            <CombineToggle
              value={node.combineWithPrevious ?? 'and'}
              onChange={(c) => setCombineAt(index, c)}
            />
          ) : null}

          {node.type === 'condition' ? (
            <div className="group flex items-center gap-3 rounded-lg border border-bonsai-slate-200 bg-white p-3">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-3">
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-t-sm border-0 border-b border-bonsai-slate-200 bg-white py-2 pl-3 pr-8 text-secondary text-bonsai-slate-700 focus:border-bonsai-sage-600 focus:ring-0"
                    value={node.field}
                    onChange={(e) => {
                      const field = e.target.value
                      const op = getDefaultOperator(field)
                      updateNodeAt(index, {
                        type: 'condition',
                        id: node.id,
                        field,
                        operator: op,
                        value: getDefaultValue(field, op),
                        combineWithPrevious: node.combineWithPrevious,
                      })
                    }}
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
                    className="w-full appearance-none rounded-t-sm border-0 border-b border-bonsai-slate-200 bg-white py-2 pl-3 pr-8 text-secondary text-bonsai-slate-700 focus:border-bonsai-sage-600 focus:ring-0"
                    value={node.operator}
                    onChange={(e) => {
                      const op = e.target.value
                      const isDateField = [
                        'start_date',
                        'due_date',
                        'created_at',
                        'updated_at',
                        'completed_at',
                      ].includes(node.field)
                      updateNodeAt(index, {
                        ...node,
                        operator: op,
                        value: isDateField ? getDefaultValue(node.field, op) : node.value,
                      })
                    }}
                    aria-label="Operator"
                  >
                    {getOperatorsForField(node.field).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-bonsai-slate-400">
                    <MaterialIcon name="expand_more" className="text-[18px]" />
                  </span>
                </div>
                <FilterCriteriaEditor
                  field={node.field}
                  operator={node.operator}
                  value={node.value}
                  onValueChange={(v) => updateNodeAt(index, { ...node, value: v })}
                  availableTagNames={availableTagNames}
                />
              </div>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="shrink-0 p-1 text-bonsai-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                aria-label="Remove filter"
              >
                <MaterialIcon name="delete" className="text-[22px]" />
              </button>
            </div>
          ) : (
            /* Legacy nested groups: still editable if present in saved filters */
            <div className="relative">
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-2 top-2 z-10 p-1 text-bonsai-slate-400 hover:text-red-600"
                aria-label="Remove filter group"
              >
                <MaterialIcon name="delete" className="text-[20px]" />
              </button>
              <FilterGroupEditor
                nodes={node.children}
                depth={depth + 1}
                onNodesChange={(children) => {
                  if (children.length === 0) {
                    removeAt(index)
                  } else {
                    updateNodeAt(index, { ...node, children })
                  }
                }}
                availableTagNames={availableTagNames}
              />
            </div>
          )}
        </div>
      ))}

      {depth === 0 ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={addNewFilterLine}
            className="inline-flex items-center gap-2 text-body font-semibold text-bonsai-sage-700 hover:text-bonsai-sage-800"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add new filter</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
