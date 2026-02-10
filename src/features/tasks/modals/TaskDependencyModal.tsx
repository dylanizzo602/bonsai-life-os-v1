/* TaskDependencyModal: Link this task as blocking or blocked-by another task */

import { useState, useEffect } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Select } from '../../../components/Select'
import type { Task, TaskDependency, CreateTaskDependencyInput } from '../types'

export interface TaskDependencyModalProps {
  isOpen: boolean
  onClose: () => void
  currentTaskId: string
  getTasks: () => Promise<Task[]>
  getTaskDependencies: (taskId: string) => Promise<{
    blocking: TaskDependency[]
    blockedBy: TaskDependency[]
  }>
  onAddDependency: (input: CreateTaskDependencyInput) => Promise<void>
}

type Relation = 'blocked_by' | 'blocks'

export function TaskDependencyModal({
  isOpen,
  onClose,
  currentTaskId,
  getTasks,
  getTaskDependencies,
  onAddDependency,
}: TaskDependencyModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [blocking, setBlocking] = useState<TaskDependency[]>([])
  const [blockedBy, setBlockedBy] = useState<TaskDependency[]>([])
  const [loading, setLoading] = useState(false)
  const [relation, setRelation] = useState<Relation>('blocked_by')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* Fetch tasks and dependencies when modal opens */
  useEffect(() => {
    if (!isOpen || !currentTaskId) return
    setLoading(true)
    Promise.all([getTasks(), getTaskDependencies(currentTaskId)])
      .then(([taskList, deps]) => {
        setTasks(taskList.filter((t) => t.id !== currentTaskId))
        setBlocking(deps.blocking)
        setBlockedBy(deps.blockedBy)
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false)
        setSelectedTaskId('')
      })
  }, [isOpen, currentTaskId, getTasks, getTaskDependencies])

  const handleAdd = async () => {
    if (!selectedTaskId) return
    setSubmitting(true)
    try {
      if (relation === 'blocked_by') {
        await onAddDependency({ blocker_id: selectedTaskId, blocked_id: currentTaskId })
      } else {
        await onAddDependency({ blocker_id: currentTaskId, blocked_id: selectedTaskId })
      }
      const deps = await getTaskDependencies(currentTaskId)
      setBlocking(deps.blocking)
      setBlockedBy(deps.blockedBy)
      setSelectedTaskId('')
    } catch (err) {
      console.error('Error adding dependency:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const taskOptions = tasks.map((t) => ({ value: t.id, label: t.title }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task dependencies"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={!selectedTaskId || submitting}
          >
            {submitting ? 'Adding...' : 'Add link'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-bonsai-slate-500">Loading...</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
                Relationship
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRelation('blocked_by')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    relation === 'blocked_by'
                      ? 'bg-bonsai-sage-600 text-white'
                      : 'bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200'
                  }`}
                >
                  This task is blocked by
                </button>
                <button
                  type="button"
                  onClick={() => setRelation('blocks')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    relation === 'blocks'
                      ? 'bg-bonsai-sage-600 text-white'
                      : 'bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200'
                  }`}
                >
                  This task blocks
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
                {relation === 'blocked_by' ? 'Blocked by task' : 'Blocks task'}
              </label>
              <Select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                options={[{ value: '', label: 'Select a task...' }, ...taskOptions]}
              />
            </div>
            {(blockedBy.length > 0 || blocking.length > 0) && (
              <div className="text-sm text-bonsai-slate-600 space-y-1">
                {blockedBy.length > 0 && (
                  <p>
                    <span className="font-medium">Blocked by:</span>{' '}
                    {blockedBy.length} task(s) must be completed first.
                  </p>
                )}
                {blocking.length > 0 && (
                  <p>
                    <span className="font-medium">Blocking:</span> This task blocks{' '}
                    {blocking.length} other task(s).
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
