/* WeeklyEntryView: Read-only view for completed weekly briefing entries */

import { Button } from '../../../components/Button'
import type { ReflectionEntry } from '../types'
import { formatEntryDate, getEntryDisplayTitle } from '../utils/entryDisplay'

interface WeeklyEntryViewProps {
  entry: ReflectionEntry
  onBack: () => void
}

/**
 * Read-only weekly briefing entry view (weekly flow stores title only for now).
 */
export function WeeklyEntryView({ entry, onBack }: WeeklyEntryViewProps) {
  return (
    <div className="min-h-full">
      <Button type="button" variant="ghost" onClick={onBack} className="mb-4">
        Back to list
      </Button>

      <h2 className="mb-2 text-body font-bold text-on-surface">
        {getEntryDisplayTitle(entry)}
      </h2>
      <p className="mb-6 text-secondary text-on-surface-variant">
        Weekly Review · {formatEntryDate(entry.created_at)}
      </p>
      <p className="text-body text-on-surface-variant">
        Weekly review completed. Open the weekly briefing flow again to review goals and tasks
        for the current week.
      </p>
    </div>
  )
}
