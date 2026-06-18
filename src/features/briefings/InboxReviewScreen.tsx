/* InboxReviewScreen: Process inbox items before planning the day */

import { BriefingShell, BriefingScreenHeading } from './components/BriefingShell'
import type { InboxItem } from '../home/types'

interface InboxReviewScreenProps {
  items: InboxItem[]
  loading: boolean
  error: string | null
  onConvertToTask: (item: InboxItem) => void
  onDeleteItem: (id: string) => Promise<void>
  onClose?: () => void
}

/**
 * Inbox review step: convert or delete inbox items before Today's Plan.
 * Primary CTA lives in BriefingProgressFooter (parent).
 */
export function InboxReviewScreen({
  items,
  loading,
  error,
  onConvertToTask,
  onDeleteItem,
  onClose,
}: InboxReviewScreenProps) {
  return (
    <BriefingShell>
      <div className="mx-auto max-w-2xl">
        <BriefingScreenHeading
          title="Clear your inbox"
          description="Go through each inbox item before you plan your day. Convert what matters into a task, or delete what you don't need."
          onClose={onClose}
        />

        {loading ? (
          <p className="text-secondary text-on-surface-variant">Loading inbox…</p>
        ) : error ? (
          <p className="text-secondary text-error">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-body mb-8 text-on-surface-variant">You&apos;re all caught up.</p>
        ) : (
          <ul className="mb-8 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-body min-w-0 font-medium text-on-surface">{item.name}</span>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onConvertToTask(item)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
                  >
                    Convert to task
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteItem(item.id)}
                    className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BriefingShell>
  )
}
