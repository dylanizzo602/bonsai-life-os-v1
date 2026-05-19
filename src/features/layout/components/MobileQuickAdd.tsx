/* MobileQuickAdd: Task / Note / Inbox quick-add buttons for mobile nav */

import { MaterialIcon } from '../../../components/MaterialIcon'

interface QuickAddAction {
  id: 'task' | 'note' | 'inbox'
  label: string
  icon: string
  onClick: () => void
}

interface MobileQuickAddProps {
  onAddTask: () => void
  onAddNote: () => void
  onAddInbox: () => void
}

/**
 * Quick Add card matching zenith mobile nav design (lavender panel, three actions).
 */
export function MobileQuickAdd({ onAddTask, onAddNote, onAddInbox }: MobileQuickAddProps) {
  const actions: QuickAddAction[] = [
    { id: 'task', label: 'Task', icon: 'add_task', onClick: onAddTask },
    { id: 'note', label: 'Note', icon: 'note_add', onClick: onAddNote },
    { id: 'inbox', label: 'Inbox', icon: 'move_to_inbox', onClick: onAddInbox },
  ]

  return (
    <div className="w-full shrink-0 rounded-2xl bg-secondary-fixed/45 px-3 py-3">
      <p className="mb-2 text-secondary font-semibold leading-snug text-on-surface-variant">
        Quick Add
      </p>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/60 bg-surface-container-lowest/90 px-2 py-3 transition-colors hover:bg-white active:scale-[0.98]"
          >
            <MaterialIcon name={action.icon} className="text-[26px] text-on-surface-variant" />
            <span className="text-sm font-semibold text-on-surface-variant">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
