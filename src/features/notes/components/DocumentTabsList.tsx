/* DocumentTabsList: Shared hierarchical page tree for sidebar and mobile sheet */
import { useState, useEffect } from 'react'
import { DocumentTabItem } from './DocumentTabItem'
import type { NotePageTreeNode } from '../types'

interface DocumentTabsListProps {
  pageTree: NotePageTreeNode[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onRenamePage: (pageId: string, title: string) => void
  onAddSubpage: (parentPageId: string) => void
  onDeletePage: (pageId: string) => void
}

/**
 * Renders the expandable page/subpage tree used in desktop sidebar and mobile sheet.
 */
export function DocumentTabsList({
  pageTree,
  selectedPageId,
  onSelectPage,
  onRenamePage,
  onAddSubpage,
  onDeletePage,
}: DocumentTabsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  /* Auto-expand parent when a subpage is selected */
  useEffect(() => {
    if (!selectedPageId) return
    for (const node of pageTree) {
      if (node.children.some((c) => c.id === selectedPageId)) {
        setExpandedIds((prev) => {
          if (prev.has(node.id)) return prev
          const next = new Set(prev)
          next.add(node.id)
          return next
        })
        break
      }
    }
  }, [selectedPageId, pageTree])

  /* Toggle expand state for a parent page */
  const toggleExpand = (pageId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }

  const handleSelect = (pageId: string) => {
    onSelectPage(pageId)
  }

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Page list">
      {pageTree.map((node) => {
        const hasChildren = node.children.length > 0
        const isExpanded =
          expandedIds.has(node.id) || node.children.some((c) => c.id === selectedPageId)

        return (
          <div key={node.id}>
            <DocumentTabItem
              page={node}
              isSelected={selectedPageId === node.id}
              isTopLevel
              depth={0}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onSelect={() => handleSelect(node.id)}
              onToggleExpand={() => toggleExpand(node.id)}
              onRename={(title) => onRenamePage(node.id, title)}
              onAddSubpage={() => onAddSubpage(node.id)}
              onDelete={() => onDeletePage(node.id)}
            />
            {hasChildren &&
              isExpanded &&
              node.children.map((child) => (
                <DocumentTabItem
                  key={child.id}
                  page={child}
                  isSelected={selectedPageId === child.id}
                  isTopLevel={false}
                  depth={1}
                  hasChildren={false}
                  isExpanded={false}
                  onSelect={() => handleSelect(child.id)}
                  onRename={(title) => onRenamePage(child.id, title)}
                  onDelete={() => onDeletePage(child.id)}
                />
              ))}
          </div>
        )
      })}
    </nav>
  )
}
