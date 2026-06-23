/* SearchPanelBody: Live search results and quick actions */

import { MaterialIcon } from '../../../components/MaterialIcon'
import {
  SEARCH_QUICK_ACTIONS,
  SEARCH_RESULT_ICONS,
  type SearchQuickActionId,
  type SearchResult,
} from '../types'

interface SearchPanelBodyProps {
  /** Mobile mock uses slightly smaller quick-action labels */
  compactQuickActions?: boolean
  query: string
  results: SearchResult[]
  loading?: boolean
  error?: string | null
  highlightedIndex: number
  onQuickAction: (id: SearchQuickActionId) => void
  onSelectResult: (result: SearchResult) => void
}

/**
 * Scrollable search results body reused by desktop popover and mobile full-screen search.
 */
export function SearchPanelBody({
  compactQuickActions = false,
  query,
  results,
  loading = false,
  error = null,
  highlightedIndex,
  onQuickAction,
  onSelectResult,
}: SearchPanelBodyProps) {
  const quickActionLabelClass = compactQuickActions
    ? 'text-center text-[10px] font-medium leading-tight text-on-surface'
    : 'text-center text-[12px] font-medium text-on-surface'

  const hasQuery = query.trim().length > 0

  return (
    <>
      {/* Quick Actions: shown when query is empty */}
      {!hasQuery ? (
        <section className="mb-4">
          <header className="px-4 py-2">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase">
              Quick Actions
            </h3>
          </header>
          <div className="grid grid-cols-4 gap-2 px-2">
            {SEARCH_QUICK_ACTIONS.map((action, index) => {
              const highlighted = highlightedIndex === index
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onQuickAction(action.id)}
                  className={`group flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                    highlighted
                      ? 'border-primary/30 bg-primary-container/10'
                      : 'border-outline-variant/20 hover:border-primary/30 hover:bg-surface-container-low'
                  }`}
                >
                  <MaterialIcon
                    name={action.icon}
                    className="mb-1.5 text-xl text-primary transition-transform group-hover:scale-110"
                  />
                  <span className={quickActionLabelClass}>{action.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Search results */}
      {hasQuery ? (
        <section className="mb-2">
          <header className="px-4 py-1.5">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase">
              Results
            </h3>
          </header>

          {loading ? (
            <p className="px-4 py-3 text-secondary text-on-surface-variant">Loading…</p>
          ) : error ? (
            <p className="px-4 py-3 text-secondary text-error">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-secondary text-on-surface-variant">No matches found</p>
          ) : (
            <div className="space-y-0.5">
              {results.map((result, index) => {
                const highlighted = highlightedIndex === index
                return (
                  <button
                    key={`${result.kind}-${result.id}-${result.pageId ?? ''}`}
                    type="button"
                    onClick={() => onSelectResult(result)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg p-3 px-4 text-left transition-colors ${
                      highlighted
                        ? 'border border-primary/20 bg-primary-container/10'
                        : 'group hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <MaterialIcon
                        name={SEARCH_RESULT_ICONS[result.kind]}
                        className={`shrink-0 text-xl ${
                          highlighted
                            ? 'text-primary'
                            : 'text-on-surface-variant group-hover:text-primary'
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm ${
                            highlighted ? 'font-semibold' : 'font-medium'
                          } text-on-surface`}
                        >
                          {result.title}
                        </p>
                        {result.subtitle ? (
                          <p className="flex items-center truncate text-[11px] text-on-surface-variant">
                            {highlighted ? (
                              <span
                                className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                                aria-hidden
                              />
                            ) : null}
                            {result.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {highlighted ? (
                      <span className="shrink-0 rounded bg-surface-container-highest px-1.5 py-0.5 text-[9px] font-bold text-on-surface-variant">
                        ENTER
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      ) : null}
    </>
  )
}
