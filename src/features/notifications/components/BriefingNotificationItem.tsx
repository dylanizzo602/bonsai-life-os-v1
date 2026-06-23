/* BriefingNotificationItem: Missed morning briefing row in the notification bell */

import { MaterialIcon } from '../../../components/MaterialIcon'

export interface BriefingNotificationItemProps {
  onOpen: () => void
}

/**
 * Morning briefing incomplete card for the bell popover (shown after local noon).
 */
export function BriefingNotificationItem({ onOpen }: BriefingNotificationItemProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container-low/80"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MaterialIcon name="wb_sunny" className="text-[20px]" />
      </span>
      <div className="min-w-0 flex-1 pr-12">
        <p className="text-body font-medium text-on-surface">Morning briefing incomplete</p>
        <p className="text-secondary text-on-surface-variant">Finish your briefing for today.</p>
      </div>
    </button>
  )
}
