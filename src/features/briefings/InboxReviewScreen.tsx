/* InboxReviewScreen: Briefing step to review inbox items and either convert them into tasks or delete them */

import { Button } from '../../components/Button'
import type { InboxItem } from '../home/types'

interface InboxReviewScreenProps {
  /** Inbox items to review in this step */
  items: InboxItem[]
  /** Loading state while inbox items are fetched */
  loading: boolean
  /** Error message if inbox failed to load */
  error: string | null
  /** Callback when the user chooses to convert an inbox item into a task */
  onConvertToTask: (item: InboxItem) => void
  /** Handler to delete an inbox item */
  onDeleteItem: (id: string) => Promise<void>
  /** Go to next step in the briefing flow */
  onNext: () => void
}

/**
 * Inbox review step: guide the user through processing their inbox items.
 * For each item the user can either convert it into a task or delete it, then continue to the next step.
 */
export function InboxReviewScreen({
  items,
  loading,
  error,
  onConvertToTask,
  onDeleteItem,
  onNext,
}: InboxReviewScreenProps) {
  /* Derived flag: whether there are any inbox items to process */
  const hasItems = items.length > 0

  return (
    <div className="flex flex-col">
      <p className="text-body font-semibold text-bonsai-brown-700 mb-2">
        Clear your inbox before you plan your day
      </p>
      <p className="text-body font-medium text-bonsai-slate-700 mb-4">
        Go through each inbox item. If it matters, convert it into a task. If not, delete it.
      </p>

      {loading ? (
        <p className="text-secondary text-bonsai-slate-500">Loading inbox…</p>
      ) : error ? (
        <p className="text-secondary text-red-600">{error}</p>
      ) : !hasItems ? (
        <p className="text-secondary text-bonsai-slate-600 mb-2">
          No inbox items right now. You are all caught up.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded border border-bonsai-slate-200 bg-white px-3 py-2"
            >
              <span className="min-w-0 truncate text-body text-bonsai-slate-800">
                {item.name}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onConvertToTask(item)}
                >
                  Convert to task
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteItem(item.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Button type="button" onClick={onNext} variant="primary" className="w-full">
          Next
        </Button>
      </div>
    </div>
  )
}

