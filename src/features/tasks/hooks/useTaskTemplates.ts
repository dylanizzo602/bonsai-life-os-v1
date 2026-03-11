/* useTaskTemplates hook: Load, create, and delete per-user task templates */
import { useState, useCallback } from 'react'
import { getTaskTemplates, createTaskTemplate, deleteTaskTemplate } from '../../../lib/supabase/taskTemplates'
import type { Task, TaskTemplate, TaskTemplateData } from '../types'
import type { ChecklistWithItems } from './useTaskChecklists'

interface UseTaskTemplatesResult {
  templates: TaskTemplate[]
  loading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  saveTemplateFromTask: (args: {
    name: string
    task: Task
    checklists: ChecklistWithItems[]
    subtasks?: Task[]
  }) => Promise<TaskTemplate>
  removeTemplate: (id: string) => Promise<void>
}

/** Build a TaskTemplateData snapshot from a task plus its checklists and optional subtasks. */
function buildTemplateData(args: {
  task: Task
  checklists: ChecklistWithItems[]
  subtasks?: Task[]
}): TaskTemplateData {
  const { task, checklists, subtasks = [] } = args

  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    goal_id: task.goal_id,
    time_estimate: task.time_estimate,
    attachments: task.attachments ?? [],
    category: task.category,
    recurrence_pattern: task.recurrence_pattern,
    tags: task.tags ?? [],
    checklists: checklists.map((cl) => ({
      title: cl.title,
      items: (cl.items ?? []).map((item) => ({
        title: item.title,
        completed: item.completed,
      })),
    })),
    subtasks: subtasks.map((st) => ({
      title: st.title,
      description: st.description,
      priority: st.priority,
      time_estimate: st.time_estimate,
      recurrence_pattern: st.recurrence_pattern,
    })),
  }
}

export function useTaskTemplates(): UseTaskTemplatesResult {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Fetch all templates for the current user */
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTaskTemplates()
      setTemplates(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load task templates'
      setError(message)
      console.error('Error fetching task templates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Create a new template from the given task snapshot */
  const saveTemplateFromTask = useCallback(
    async (args: {
      name: string
      task: Task
      checklists: ChecklistWithItems[]
      subtasks?: Task[]
    }): Promise<TaskTemplate> => {
      try {
        setError(null)
        const data: TaskTemplateData = buildTemplateData(args)
        const created = await createTaskTemplate({ name: args.name, data })
        setTemplates((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save task template'
        setError(message)
        console.error('Error creating task template:', err)
        throw err
      }
    },
    [],
  )

  /* Delete a template by id and update local state */
  const removeTemplate = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteTaskTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete task template'
      setError(message)
      console.error('Error deleting task template:', err)
      throw err
    }
  }, [])

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    saveTemplateFromTask,
    removeTemplate,
  }
}

