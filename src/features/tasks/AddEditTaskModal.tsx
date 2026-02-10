/* AddEditTaskModal: Reusable modal for adding or editing a task (UI only, no behavior) */
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
  FlagIcon,
  TagIcon,
  HourglassIcon,
} from '../../components/icons'

export interface AddEditTaskModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** When true, title and primary button show "Edit Task"; otherwise "Add Task" */
  isEdit?: boolean
}

/**
 * Reusable Add Task / Edit Task modal.
 * Screen-centered, white, rounded modal with task name, metadata pills, and collapsible advanced options.
 * No functionality wired; layout and copy only.
 */
export function AddEditTaskModal({ isOpen, onClose, isEdit = false }: AddEditTaskModalProps) {
  /* Advanced options: collapsed by default, toggle changes visibility of description/attachments/checklists/subtasks/dependencies */
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const title = isEdit ? 'Edit Task' : 'Add Task'
  const primaryButtonLabel = isEdit ? 'Edit Task' : 'Add Task'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary">{primaryButtonLabel}</Button>
        </>
      }
    >
      {/* Main task input: Single-line task name */}
      <div className="mb-4">
        <Input placeholder="What needs to be done?" className="border-bonsai-slate-300" />
      </div>

      {/* Metadata pills: Add start/due date, priority, tags, estimate (non-functional) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <CalendarIcon className="w-4 h-4 text-bonsai-slate-600" />
          Add start/due date
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <FlagIcon className="w-4 h-4 text-bonsai-slate-600" />
          Set priority
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <TagIcon className="w-4 h-4 text-bonsai-slate-600" />
          Add tags
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-bonsai-slate-100 px-3 py-1.5 text-sm font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-200 transition-colors"
        >
          <HourglassIcon className="w-4 h-4 text-bonsai-slate-600" />
          Add estimate
        </button>
      </div>

      {/* Advanced options toggle: Expand/collapse with chevron */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-sm text-bonsai-slate-600 hover:text-bonsai-slate-800 mb-4"
      >
        {advancedOpen ? (
          <ChevronDownIcon className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 shrink-0" />
        )}
        <span className="font-medium">Advanced options</span>
        <span className="text-bonsai-slate-500 font-normal">(description, goals, attachments, breakdown)</span>
      </button>

      {/* Expanded advanced section: Notes, attachments, checklists, subtasks, dependencies */}
      {advancedOpen && (
        <div className="space-y-4 pt-2 border-t border-bonsai-slate-200">
          {/* Notes/details textarea */}
          <div>
            <textarea
              readOnly
              placeholder="Add notes or details..."
              className="w-full min-h-[80px] rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm text-bonsai-slate-700 placeholder:text-bonsai-slate-400 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent"
              aria-label="Notes or details"
            />
          </div>

          {/* Attachments: Add attachment link-style button */}
          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Attachments</p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm font-medium text-bonsai-slate-600 hover:bg-bonsai-slate-50 hover:border-bonsai-slate-400 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add attachment
            </button>
          </div>

          {/* Checklists: New checklist input */}
          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Checklists</p>
            <Input placeholder="Create a new checklist" className="border-bonsai-slate-300" />
          </div>

          {/* Subtasks: Input with small action icons and Add button */}
          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Subtasks</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="Subtask name" className="flex-1 min-w-[120px] border-bonsai-slate-300" />
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" className="p-1.5 rounded text-bonsai-slate-500 hover:bg-bonsai-slate-100" aria-label="Tag">
                  <TagIcon className="w-4 h-4" />
                </button>
                <button type="button" className="p-1.5 rounded text-bonsai-slate-500 hover:bg-bonsai-slate-100" aria-label="Date">
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button type="button" className="p-1.5 rounded text-bonsai-slate-500 hover:bg-bonsai-slate-100" aria-label="Priority">
                  <FlagIcon className="w-4 h-4" />
                </button>
                <button type="button" className="p-1.5 rounded text-bonsai-slate-500 hover:bg-bonsai-slate-100" aria-label="Estimate">
                  <HourglassIcon className="w-4 h-4" />
                </button>
                <Button variant="secondary" size="sm">
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Task dependencies: Link blocking/blocked-by */}
          <div>
            <p className="text-sm font-medium text-bonsai-slate-700 mb-1">Task Dependencies</p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bonsai-slate-300 px-3 py-2 text-sm font-medium text-bonsai-slate-600 hover:bg-bonsai-slate-50 hover:border-bonsai-slate-400 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Link blocking or blocked-by tasks
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
