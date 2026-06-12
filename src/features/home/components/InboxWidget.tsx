/* InboxWidget: Quick-capture inbox with convert-to-task on hover */

import { useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DashboardBentoCard } from './DashboardBentoCard'
import type { CreateInboxItemInput, InboxItem } from '../types'

export interface InboxWidgetProps {
  items: InboxItem[]
  loading: boolean
  error: string | null
  onAddItem: (input: CreateInboxItemInput) => Promise<InboxItem>
  onDeleteItem: (id: string) => Promise<void>
  onConvertToTask: (item: InboxItem) => void
}

/**
 * Inbox bento widget (5-column span): underline input, bullet list, convert on hover.
 */
export function InboxWidget({
  items,
  loading,
  error,
  onAddItem,
  onDeleteItem,
  onConvertToTask,
}: InboxWidgetProps) {
  const [draft, setDraft] = useState('')

  const handleAdd = async () => {
    const name = draft.trim()
    if (!name) return
    try {
      await onAddItem({ name })
      setDraft('')
    } catch {
      /* error surfaced via hook */
    }
  }

  return (
    <DashboardBentoCard
      title="Inbox"
      titleIcon={<MaterialIcon name="inbox" className="text-[24px] text-outline" />}
      className="relative overflow-hidden bg-surface-container-lowest"
    >
      {/* Decorative accent */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-bl-full bg-primary-fixed/30"
        aria-hidden
      />

      <div className="relative z-10">
        <input
          id="inbox-quick-capture-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
          placeholder="Type a thought and press enter..."
          className="mb-6 w-full border-0 border-b-2 border-surface-variant bg-transparent px-0 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 transition-colors focus:border-primary focus:ring-0"
        />

        {loading ? (
          <p className="text-secondary text-on-surface-variant">Loading…</p>
        ) : error ? (
          <p className="text-secondary text-error">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-secondary text-on-surface-variant">Nothing in your inbox yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="group relative flex items-center gap-3 border-b border-surface-variant/50 py-2 text-body text-on-surface-variant last:border-0"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40 transition-colors group-hover:bg-primary"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate pr-16">{item.name}</span>
                {/* Row actions: delete from inbox or convert to task (shown on hover) */}
                <div className="absolute right-0 flex items-center gap-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => void onDeleteItem(item.id)}
                    className="flex items-center justify-center rounded-full p-1 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                    title="Delete from inbox"
                    aria-label={`Delete "${item.name}" from inbox`}
                  >
                    <MaterialIcon name="close" className="text-[20px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onConvertToTask(item)}
                    className="flex items-center justify-center rounded-full p-1 text-primary transition-colors hover:bg-primary/10"
                    title="Convert to Task"
                    aria-label={`Convert "${item.name}" to task`}
                  >
                    <MaterialIcon name="check_circle" className="text-[20px]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardBentoCard>
  )
}
