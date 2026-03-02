/* InboxWidget: List of name-only items; hover shows Convert to task and delete */

import { useState } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { useInbox } from '../hooks/useInbox'
import type { InboxItem } from '../types'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { PlusIcon } from '../../../components/icons'

export interface InboxWidgetProps {
  onConvertToTask: (item: InboxItem) => void
}

/**
 * Inbox widget: add items (name only), list with hover "Convert to task" and delete.
 */
export function InboxWidget({ onConvertToTask }: InboxWidgetProps) {
  const { items, loading, error, addItem, deleteItem } = useInbox()
  const [newName, setNewName] = useState('')
  const [hoverId, setHoverId] = useState<string | null>(null)

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await addItem({ name })
      setNewName('')
    } catch {
      // error state from hook
    }
  }

  return (
    <DashboardWidget
      title="Inbox"
      actions={
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add item..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-32 text-body"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg p-2 text-bonsai-slate-600 hover:bg-bonsai-slate-100"
            aria-label="Add inbox item"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-secondary text-bonsai-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-secondary text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500">No inbox items. Add an idea above.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center justify-between gap-2 rounded border border-transparent py-1.5 pr-2 hover:border-bonsai-slate-200 hover:bg-bonsai-slate-50/50"
              onMouseEnter={() => setHoverId(item.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <span className="min-w-0 truncate text-body text-bonsai-slate-800">{item.name}</span>
              {hoverId === item.id && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onConvertToTask(item)}
                  >
                    Convert to task
                  </Button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="rounded p-1 text-bonsai-slate-500 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700"
                    aria-label={`Delete ${item.name}`}
                  >
                    ×
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  )
}
