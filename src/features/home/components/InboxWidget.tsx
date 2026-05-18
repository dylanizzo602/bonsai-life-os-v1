/* InboxWidget: Quick-capture inbox with convert-to-task on hover */

import { useState } from 'react'
import { DashboardBentoCard } from './DashboardBentoCard'
import type { CreateInboxItemInput, InboxItem } from '../types'
import { ChevronRightIcon } from '../../../components/icons'

/** Delete icon for inbox row actions */
function TrashIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

/** Inbox tray icon for card header */
function InboxIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  )
}

export interface InboxWidgetProps {
  items: InboxItem[]
  loading: boolean
  error: string | null
  onAddItem: (input: CreateInboxItemInput) => Promise<InboxItem>
  onDeleteItem: (id: string) => Promise<void>
  onConvertToTask: (item: InboxItem) => void
}

/**
 * Inbox bento widget: bottom-border input and bullet list with convert-to-task affordance.
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
      // error surfaced via hook
    }
  }

  return (
    <DashboardBentoCard
      title="Inbox"
      titleIcon={<InboxIcon />}
      className="relative overflow-hidden bg-surface-container-lowest"
    >
      {/* Decorative accent */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-bl-full bg-primary-fixed/30"
        aria-hidden
      />

      <div className="relative z-10">
        <input
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
                {/* Row actions: convert to task and delete (visible on hover) */}
                <div className="absolute right-0 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onConvertToTask(item)}
                    className="flex items-center justify-center rounded-full p-1 text-bonsai-sage-400 transition-colors hover:bg-bonsai-sage-400/10"
                    title="Convert to Task"
                    aria-label={`Convert "${item.name}" to task`}
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteItem(item.id)}
                    className="flex items-center justify-center rounded-full p-1 text-bonsai-slate-400 transition-colors hover:bg-bonsai-slate-200 hover:text-bonsai-slate-600"
                    title="Delete"
                    aria-label={`Delete "${item.name}"`}
                  >
                    <TrashIcon />
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
