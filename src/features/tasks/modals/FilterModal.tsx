/* FilterModal: ClickUp-style nested filter rules (FilterRoot + FilterGroupEditor) */

import { useMemo, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { FilterGroupEditor } from '../components/filters/FilterGroupEditor'
import type { FilterRoot } from '../types/filter'
import { cloneFilterRoot } from '../utils/filterSummary'
import { MODAL_DEFAULT_FILTER_ROOT } from '../utils/filterMigration'

export interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  filterRoot: FilterRoot
  onFilterRootChange: (root: FilterRoot) => void
  onApply?: () => void
  availableTagNames?: string[]
}

interface FilterModalBodyProps {
  initialRoot: FilterRoot
  onClose: () => void
  onFilterRootChange: (root: FilterRoot) => void
  onApply?: () => void
  availableTagNames: string[]
}

/** Draft editor: remounts when modal opens so local state matches initialRoot */
function FilterModalBody({
  initialRoot,
  onClose,
  onFilterRootChange,
  onApply,
  availableTagNames,
}: FilterModalBodyProps) {
  const [localRoot, setLocalRoot] = useState(() => cloneFilterRoot(initialRoot))

  const handleClearAll = () => {
    const reset = cloneFilterRoot(MODAL_DEFAULT_FILTER_ROOT)
    setLocalRoot(reset)
    onFilterRootChange(reset)
  }

  const handleApply = () => {
    onFilterRootChange(localRoot)
    onApply?.()
    onClose()
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterGroupEditor
        nodes={localRoot.children}
        depth={0}
        onNodesChange={(children) => setLocalRoot({ children })}
        availableTagNames={availableTagNames}
      />

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
  )
}

/**
 * Filter modal: nested groups, per-row And/Or, field/operator/criteria from filterFields config.
 */
export function FilterModal({
  isOpen,
  onClose,
  filterRoot,
  onFilterRootChange,
  onApply,
  availableTagNames = [],
}: FilterModalProps) {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleNode} fullScreenOnMobile disableBodyScroll>
      {isOpen ? (
        <FilterModalBody
          key={filterRoot.children.map((n) => n.id).join(',') || 'empty'}
          initialRoot={filterRoot}
          onClose={onClose}
          onFilterRootChange={onFilterRootChange}
          onApply={onApply}
          availableTagNames={availableTagNames}
        />
      ) : null}
    </Modal>
  )
}
