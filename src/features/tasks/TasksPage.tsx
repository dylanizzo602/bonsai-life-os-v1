/* Tasks page: Blank canvas placeholder for Tasks section */
import { AddButton } from '../../components/AddButton'
import { BellIcon } from '../../components/icons'

/**
 * Dropdown content for Add new task: single "Add new reminder" option with bell icon.
 * Uses app typography and Bonsai palette.
 */
function AddTaskDropdownContent() {
  return (
    <button
      type="button"
      className="flex flex-nowrap items-center justify-end gap-2 rounded px-2 py-1 text-sm font-medium text-bonsai-brown-700 hover:bg-bonsai-slate-100 whitespace-nowrap md:text-base"
    >
      <BellIcon className="w-4 h-4 shrink-0 md:w-5 md:h-5 text-bonsai-brown-700" />
      Add new reminder
    </button>
  )
}

/**
 * Tasks page component
 * Displays a blank canvas with the section name and add-task button (with dropdown) in the header
 */
export function TasksPage() {
  return (
    <div className="min-h-full">
      {/* Section header: Title on left, add button (with dropdown) on right corner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-bonsai-brown-700">Tasks</h1>
        <AddButton
          className="self-end sm:self-auto"
          aria-label="Add new task"
          dropdownContent={<AddTaskDropdownContent />}
        >
          Add new task
        </AddButton>
      </div>
      {/* Blank canvas: Empty space for future content */}
      <div className="w-full h-full min-h-[60vh]" />
    </div>
  )
}
