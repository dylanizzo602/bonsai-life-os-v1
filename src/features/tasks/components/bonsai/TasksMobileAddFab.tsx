/* TasksMobileAddFab: Floating add-task control when layout uses hamburger nav (< lg) */

import { MaterialIcon } from '../../../../components/MaterialIcon'

interface TasksMobileAddFabProps {
  onAddTask: () => void
}

/**
 * Bottom-right FAB below md (768px), matching TopNav hamburger (`md:hidden` on menu button).
 */
export function TasksMobileAddFab({ onAddTask }: TasksMobileAddFabProps) {
  return (
    <button
      type="button"
      onClick={onAddTask}
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-bonsai-sage-600 text-white shadow-lg transition-colors hover:bg-bonsai-sage-700 active:scale-95 md:hidden"
      aria-label="Add task"
    >
      <MaterialIcon name="add" className="text-[28px]" />
    </button>
  )
}
