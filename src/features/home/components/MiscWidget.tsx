/* MiscWidget: Quotes, announcements, prompts; for now a static quote */

import { DashboardWidget } from './DashboardWidget'

const DEFAULT_QUOTE =
  'True growth comes from being "sincere and making full effort in each moment" rather than chasing a future goal.'

/**
 * Misc widget: placeholder for quotes, announcements, prompts. Displays a static quote for now.
 */
export function MiscWidget() {
  return (
    <DashboardWidget title="Misc">
      <p className="text-body text-bonsai-slate-700 italic">&ldquo;{DEFAULT_QUOTE}&rdquo;</p>
    </DashboardWidget>
  )
}
