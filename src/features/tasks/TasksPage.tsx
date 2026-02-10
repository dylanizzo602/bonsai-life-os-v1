/* Tasks page: Blank canvas placeholder for Tasks section */
import { AddButton } from '../../components/AddButton'

/**
 * Tasks page component
 * Displays a blank canvas with the section name and add-task button in the header
 */
export function TasksPage() {
  return (
    <div className="min-h-full">
      {/* Section header: Title on left, add button on right corner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-bonsai-brown-700">Tasks</h1>
        <AddButton className="self-end sm:self-auto" aria-label="Add new task">
          Add new task
        </AddButton>
      </div>
      {/* Blank canvas: Empty space for future content */}
      <div className="w-full h-full min-h-[60vh]" />
    </div>
  )
}
