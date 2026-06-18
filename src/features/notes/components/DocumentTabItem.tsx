/* DocumentTabItem: Single page or subpage row in the document tabs sidebar */
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DocumentTabMenu } from './DocumentTabMenu'
import type { NotePage } from '../types'

interface DocumentTabItemProps {
  page: NotePage
  isSelected: boolean
  isTopLevel: boolean
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand?: () => void
  onRename: (title: string) => void
  onAddSubpage?: () => void
  onDelete: () => void
}

/**
 * One tab row in the document sidebar (top-level or indented subpage).
 */
export function DocumentTabItem({
  page,
  isSelected,
  isTopLevel,
  depth,
  hasChildren,
  isExpanded,
  onSelect,
  onToggleExpand,
  onRename,
  onAddSubpage,
  onDelete,
}: DocumentTabItemProps) {
  const indent = depth * 16

  return (
    <div className="flex items-center gap-0.5" style={{ paddingLeft: indent }}>
      {/* Expand chevron for parents with subpages */}
      {isTopLevel && hasChildren ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand?.()
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:text-primary"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse subpages' : 'Expand subpages'}
        >
          <MaterialIcon
            name="expand_more"
            className={`text-[18px] transition-transform ${isExpanded ? '' : '-rotate-90'}`}
          />
        </button>
      ) : (
        <span className="h-7 w-7 shrink-0" aria-hidden />
      )}

      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
          isSelected
            ? 'bg-secondary-fixed text-on-secondary-fixed'
            : 'text-on-surface-variant hover:bg-surface-container-low'
        }`}
        aria-current={isSelected ? 'page' : undefined}
      >
        <MaterialIcon name="description" className="shrink-0 text-[18px]" />
        <span className="truncate text-secondary font-medium">
          {page.title || 'Untitled'}
        </span>
      </button>

      {isSelected && (
        <DocumentTabMenu
          page={page}
          isTopLevel={isTopLevel}
          onRename={onRename}
          onAddSubpage={onAddSubpage}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}
