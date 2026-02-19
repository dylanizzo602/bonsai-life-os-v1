/* MilestoneList component: List of milestones for a goal */
import { useState } from 'react'
import { Button } from '../../components/Button'
import { PlusIcon } from '../../components/icons'
import { MilestoneItem } from './MilestoneItem'
import { AddEditMilestoneModal } from './AddEditMilestoneModal'
import type { GoalMilestone, CreateMilestoneInput, UpdateMilestoneInput } from './types'

interface MilestoneListProps {
  /** Goal ID */
  goalId: string
  /** Milestones to display */
  milestones: GoalMilestone[]
  /** Create milestone handler */
  onCreateMilestone: (input: CreateMilestoneInput) => Promise<GoalMilestone>
  /** Update milestone handler */
  onUpdateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<GoalMilestone>
  /** Delete milestone handler */
  onDeleteMilestone: (id: string) => Promise<void>
  /** Function to fetch tasks for task picker */
  getTasks?: () => Promise<Array<{ id: string; title: string }>>
  /** When linked task view is shown, refetch goal so task data stays in sync */
  onTaskUpdated?: () => void
}

/**
 * Milestone list component.
 * Displays milestones with add/edit/delete functionality.
 */
export function MilestoneList({
  goalId,
  milestones,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  getTasks,
  onTaskUpdated,
  onOpenEditTaskModal,
  onOpenTaskContextMenu,
}: MilestoneListProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null)

  /* Handle add milestone */
  const handleAddMilestone = () => {
    setEditingMilestone(null)
    setModalOpen(true)
  }

  /* Handle edit milestone */
  const handleEditMilestone = (milestone: GoalMilestone) => {
    setEditingMilestone(milestone)
    setModalOpen(true)
  }

  /* Handle close modal */
  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingMilestone(null)
  }

  /* Handle toggle completion */
  const handleToggleComplete = async (id: string, completed: boolean) => {
    await onUpdateMilestone(id, { completed })
  }

  /* Handle delete */
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      await onDeleteMilestone(id)
    }
  }

  return (
    <div>
      {/* Header: title and add button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-body font-semibold text-bonsai-brown-700">Milestones</h2>
        <Button variant="primary" size="sm" onClick={handleAddMilestone}>
          <PlusIcon className="w-4 h-4" />
          Add Milestone
        </Button>
      </div>

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500 py-4">
          No milestones yet. Add your first milestone to track progress.
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditMilestone}
              onDelete={handleDelete}
              onTaskUpdated={onTaskUpdated}
              onOpenEditTaskModal={onOpenEditTaskModal}
              onOpenTaskContextMenu={onOpenTaskContextMenu}
            />
          ))}
        </div>
      )}

      {/* Add/Edit milestone modal */}
      <AddEditMilestoneModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        goalId={goalId}
        onCreateMilestone={onCreateMilestone}
        onUpdateMilestone={onUpdateMilestone}
        milestone={editingMilestone}
        getTasks={getTasks}
      />
    </div>
  )
}
