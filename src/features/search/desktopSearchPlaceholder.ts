/* desktopSearchPlaceholder: Static UI data for desktop search panel (no live search yet) */

export interface DesktopSearchQuickAction {
  id: string
  label: string
  icon: string
}

export interface DesktopSearchTaskResult {
  id: string
  title: string
  meta: string
  highlighted?: boolean
  filledIcon?: boolean
}

export interface DesktopSearchNoteResult {
  id: string
  title: string
}

export const DESKTOP_SEARCH_QUICK_ACTIONS: DesktopSearchQuickAction[] = [
  { id: 'task', label: 'New Task', icon: 'add_task' },
  { id: 'inbox', label: 'Add to Inbox', icon: 'center_focus_strong' },
  { id: 'note', label: 'New Note', icon: 'edit_note' },
  { id: 'habit', label: 'Log Habit', icon: 'auto_awesome' },
]

export const DESKTOP_SEARCH_TASK_RESULTS: DesktopSearchTaskResult[] = [
  {
    id: '1',
    title: 'Finalize Q3 Strategy Document',
    meta: 'In Progress • Due Oct 24',
    highlighted: true,
    filledIcon: true,
  },
  {
    id: '2',
    title: 'Review Design System Updates',
    meta: 'Design Team • Today',
  },
]

export const DESKTOP_SEARCH_NOTE_RESULTS: DesktopSearchNoteResult[] = [
  { id: '1', title: 'Core Philosophy' },
  { id: '2', title: 'Marketing Roadmap' },
]
