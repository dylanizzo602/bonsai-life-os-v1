/* SearchPanelBody: Shared placeholder results (quick actions, tasks, notes) */

import { MaterialIcon } from '../../../components/MaterialIcon'
import {
  DESKTOP_SEARCH_NOTE_RESULTS,
  DESKTOP_SEARCH_QUICK_ACTIONS,
  DESKTOP_SEARCH_TASK_RESULTS,
} from '../desktopSearchPlaceholder'

interface SearchPanelBodyProps {
  /** Mobile mock uses slightly smaller quick-action labels */
  compactQuickActions?: boolean
}

/**
 * Scrollable search results body reused by desktop popover and mobile full-screen search.
 */
export function SearchPanelBody({ compactQuickActions = false }: SearchPanelBodyProps) {
  const quickActionLabelClass = compactQuickActions
    ? 'text-center text-[10px] font-medium leading-tight text-on-surface'
    : 'text-center text-[12px] font-medium text-on-surface'

  return (
    <>
      {/* Quick Actions */}
      <section className="mb-4">
        <header className="px-4 py-2">
          <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase">
            Quick Actions
          </h3>
        </header>
        <div className="grid grid-cols-4 gap-2 px-2">
          {DESKTOP_SEARCH_QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="group flex flex-col items-center justify-center rounded-xl border border-outline-variant/20 p-3 transition-all hover:border-primary/30 hover:bg-surface-container-low"
            >
              <MaterialIcon
                name={action.icon}
                className="mb-1.5 text-xl text-primary transition-transform group-hover:scale-110"
              />
              <span className={quickActionLabelClass}>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tasks */}
      <section className="mb-2">
        <header className="px-4 py-1.5">
          <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase">
            Tasks
          </h3>
        </header>
        <div className="space-y-0.5">
          {DESKTOP_SEARCH_TASK_RESULTS.map((task) => (
            <button
              key={task.id}
              type="button"
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg p-3 px-4 text-left transition-colors ${
                task.highlighted
                  ? 'border border-primary/20 bg-primary-container/10'
                  : 'group hover:bg-surface-container-low'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <MaterialIcon
                  name={task.filledIcon ? 'check_circle' : 'radio_button_unchecked'}
                  className={`shrink-0 text-xl ${
                    task.highlighted
                      ? 'text-primary'
                      : 'text-on-surface-variant group-hover:text-primary'
                  }`}
                  style={
                    task.filledIcon
                      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                      : undefined
                  }
                />
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm ${
                      task.highlighted ? 'font-semibold' : 'font-medium'
                    } text-on-surface`}
                  >
                    {task.title}
                  </p>
                  <p className="flex items-center text-[11px] text-on-surface-variant">
                    {task.highlighted ? (
                      <span
                        className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                        aria-hidden
                      />
                    ) : null}
                    {task.meta}
                  </p>
                </div>
              </div>
              {task.highlighted ? (
                <span className="shrink-0 rounded bg-surface-container-highest px-1.5 py-0.5 text-[9px] font-bold text-on-surface-variant">
                  ENTER
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <section className="mb-2">
        <header className="px-4 py-1.5">
          <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase">
            Notes
          </h3>
        </header>
        <div className="space-y-0.5">
          {DESKTOP_SEARCH_NOTE_RESULTS.map((note) => (
            <button
              key={note.id}
              type="button"
              className="group flex w-full cursor-pointer items-center rounded-lg p-3 px-4 text-left transition-colors hover:bg-surface-container-low"
            >
              <MaterialIcon
                name="description"
                className="mr-3 shrink-0 text-xl text-on-surface-variant group-hover:text-primary"
              />
              <p className="truncate text-sm font-medium text-on-surface">{note.title}</p>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
