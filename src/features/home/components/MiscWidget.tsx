/* MiscWidget: Quotes, announcements, prompts */

import { getDailyQuote } from '../../../lib/inspirationalQuotes'
import { DashboardWidget } from './DashboardWidget'

/**
 * Misc widget: placeholder for quotes, announcements, prompts.
 */
export function MiscWidget() {
  const dailyQuote = getDailyQuote()

  return (
    <DashboardWidget title="Misc">
      <p className="text-body text-bonsai-slate-700 italic">&ldquo;{dailyQuote.text}&rdquo;</p>
      {dailyQuote.author ? (
        <p className="text-secondary mt-2 text-bonsai-slate-500">— {dailyQuote.author}</p>
      ) : null}
    </DashboardWidget>
  )
}
