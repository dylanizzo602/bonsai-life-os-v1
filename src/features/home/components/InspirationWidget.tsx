/* InspirationWidget: Full-width quote card with nature imagery */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { getDailyQuote } from '../../../lib/inspirationalQuotes'

/**
 * Inspiration bento widget (12-column span): forest imagery, gradient, quote.
 */
export function InspirationWidget() {
  const dailyQuote = getDailyQuote()

  return (
    <div className="group relative flex min-h-[320px] items-end overflow-hidden rounded-2xl border border-outline-variant/20 transition-all duration-500 hover:ambient-shadow-dashboard">
      <img
        src="/images/inspiration-forest.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-on-surface/20 to-transparent"
        aria-hidden
      />
      <div className="relative z-10 w-full p-8 md:w-2/3 md:p-10">
        <p className="font-headline mb-4 text-[24px] font-medium leading-tight text-on-primary opacity-90 md:text-[28px]">
          &ldquo;{dailyQuote.text}&rdquo;
        </p>
        {dailyQuote.author ? (
          <p className="text-secondary font-body uppercase tracking-widest text-on-primary/70">
            {dailyQuote.author}
          </p>
        ) : null}
      </div>
      <div className="absolute right-6 top-6 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-on-primary backdrop-blur-md">
        <MaterialIcon name="energy_savings_leaf" className="text-[14px]" />
        Inspiration
      </div>
    </div>
  )
}
