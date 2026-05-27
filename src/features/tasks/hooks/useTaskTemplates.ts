/* useTaskTemplates hook: Load, create, and delete per-user task templates */
import { useState, useCallback } from 'react'
import {
  getTaskTemplates,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
} from '../../../lib/supabase/taskTemplates'
import { getTaskChecklists, getTaskChecklistItems } from '../../../lib/supabase/tasks'
import type { Task, TaskTemplate, TaskTemplateData } from '../types'
import type { ChecklistWithItems } from './useTaskChecklists'
import type { TemplateIncludedFields, DraftChecklistInput } from '../utils/taskTemplateData'
import { buildTemplateDataFromDraft, filterTemplateDataByIncludedFields } from '../utils/taskTemplateData'

interface UseTaskTemplatesResult {
  templates: TaskTemplate[]
  loading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  saveTemplateFromTask: (args: {
    name: string
    icon?: string | null
    included?: TemplateIncludedFields
    task: Task
    checklists: ChecklistWithItems[]
    subtasks?: Task[]
  }) => Promise<TaskTemplate>
  saveTemplateFromDraft: (args: {
    name: string
    icon?: string | null
    included?: TemplateIncludedFields
    title: string
    description: string | null
    priority: Task['priority']
    goal_id: string | null
    time_estimate: number | null
    attachments: Task['attachments']
    recurrence_pattern: string | null
    tags: Task['tags']
    draftChecklists: DraftChecklistInput[]
    draftSubtasks: string[]
  }) => Promise<TaskTemplate>
  overwriteTemplateFromTask: (args: {
    id: string
    name?: string
    icon?: string | null
    included?: TemplateIncludedFields
    task: Task
    checklists: ChecklistWithItems[]
    subtasks?: Task[]
  }) => Promise<TaskTemplate>
  overwriteTemplateFromDraft: (args: {
    id: string
    name?: string
    icon?: string | null
    included?: TemplateIncludedFields
    title: string
    description: string | null
    priority: Task['priority']
    goal_id: string | null
    time_estimate: number | null
    attachments: Task['attachments']
    recurrence_pattern: string | null
    tags: Task['tags']
    draftChecklists: DraftChecklistInput[]
    draftSubtasks: string[]
  }) => Promise<TaskTemplate>
  removeTemplate: (id: string) => Promise<void>
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

  /* Create a new template from the given task snapshot, including optional subtask checklists. */
  const saveTemplateFromTask = useCallback(
    async (args: {
      name: string
      icon?: string | null
      included?: TemplateIncludedFields
      task: Task
      checklists: ChecklistWithItems[]
      subtasks?: Task[]
    }): Promise<TaskTemplate> => {
      try {
        setError(null)
        const { task, checklists, subtasks = [] } = args

        /* Build main task checklist snapshot for the template payload. */
        const mainChecklistSnapshots: TaskTemplateData['checklists'] = checklists.map((cl) => ({
          title: cl.title,
          items: (cl.items ?? []).map((item) => ({
            title: item.title,
            completed: item.completed,
          })),
        }))

        /* Build subtask snapshots, including optional checklists/items for each subtask. */
        const subtaskSnapshots: TaskTemplateData['subtasks'] = await Promise.all(
          subtasks.map(async (st) => {
            const subtaskChecklists = await getTaskChecklists(st.id)
            const checklistSnapshots = await Promise.all(
              subtaskChecklists.map(async (cl) => {
                const items = await getTaskChecklistItems(cl.id)
                return {
                  title: cl.title,
                  items: items.map((item) => ({
                    title: item.title,
                    completed: item.completed,
                  })),
                }
              }),
            )

            return {
              title: st.title,
              description: st.description,
              priority: st.priority,
              time_estimate: st.time_estimate,
              recurrence_pattern: st.recurrence_pattern,
              checklists: checklistSnapshots,
            }
          }),
        )

        const data: TaskTemplateData = {
          title: task.title,
          description: task.description,
          priority: task.priority,
          goal_id: task.goal_id,
          time_estimate: task.time_estimate,
          attachments: task.attachments ?? [],
          category: task.category,
          recurrence_pattern: task.recurrence_pattern,
          tags: task.tags ?? [],
          checklists: mainChecklistSnapshots,
          subtasks: subtaskSnapshots,
        }
        const filtered = args.included ? filterTemplateDataByIncludedFields(data, args.included) : data
        const created = await createTaskTemplate({
          name: args.name,
          icon: args.icon ?? null,
          data: filtered,
        })
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

  /* Create a new template from the current draft form state (no task id yet). */
  const saveTemplateFromDraft = useCallback(
    async (args: {
      name: string
      icon?: string | null
      included?: TemplateIncludedFields
      title: string
      description: string | null
      priority: Task['priority']
      goal_id: string | null
      time_estimate: number | null
      attachments: Task['attachments']
      recurrence_pattern: string | null
      tags: Task['tags']
      draftChecklists: DraftChecklistInput[]
      draftSubtasks: string[]
    }): Promise<TaskTemplate> => {
      try {
        setError(null)
        const data = buildTemplateDataFromDraft({
          title: args.title,
          description: args.description,
          priority: args.priority,
          goal_id: args.goal_id,
          time_estimate: args.time_estimate,
          attachments: args.attachments ?? [],
          recurrence_pattern: args.recurrence_pattern,
          tags: args.tags ?? [],
          draftChecklists: args.draftChecklists ?? [],
          draftSubtasks: args.draftSubtasks ?? [],
          included: args.included,
        })
        const created = await createTaskTemplate({ name: args.name, icon: args.icon ?? null, data })
        setTemplates((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save task template'
        setError(message)
        console.error('Error creating task template from draft:', err)
        throw err
      }
    },
    [],
  )

  /* Overwrite an existing template with the given task snapshot, including optional subtask checklists. */
  const overwriteTemplateFromTask = useCallback(
    async (args: {
      id: string
      name?: string
      icon?: string | null
      included?: TemplateIncludedFields
      task: Task
      checklists: ChecklistWithItems[]
      subtasks?: Task[]
    }): Promise<TaskTemplate> => {
      try {
        setError(null)
        const { task, checklists, subtasks = [] } = args

        /* Build main task checklist snapshot for the template payload. */
        const mainChecklistSnapshots: TaskTemplateData['checklists'] = checklists.map((cl) => ({
          title: cl.title,
          items: (cl.items ?? []).map((item) => ({
            title: item.title,
            completed: item.completed,
          })),
        }))

        /* Build subtask snapshots, including optional checklists/items for each subtask. */
        const subtaskSnapshots: TaskTemplateData['subtasks'] = await Promise.all(
          subtasks.map(async (st) => {
            const subtaskChecklists = await getTaskChecklists(st.id)
            const checklistSnapshots = await Promise.all(
              subtaskChecklists.map(async (cl) => {
                const items = await getTaskChecklistItems(cl.id)
                return {
                  title: cl.title,
                  items: items.map((item) => ({
                    title: item.title,
                    completed: item.completed,
                  })),
                }
              }),
            )

            return {
              title: st.title,
              description: st.description,
              priority: st.priority,
              time_estimate: st.time_estimate,
              recurrence_pattern: st.recurrence_pattern,
              checklists: checklistSnapshots,
            }
          }),
        )

        const data: TaskTemplateData = {
          title: task.title,
          description: task.description,
          priority: task.priority,
          goal_id: task.goal_id,
          time_estimate: task.time_estimate,
          attachments: task.attachments ?? [],
          category: task.category,
          recurrence_pattern: task.recurrence_pattern,
          tags: task.tags ?? [],
          checklists: mainChecklistSnapshots,
          subtasks: subtaskSnapshots,
        }

        const filtered = args.included ? filterTemplateDataByIncludedFields(data, args.included) : data
        const updated = await updateTaskTemplate(args.id, {
          name: args.name,
          icon: args.icon,
          data: filtered,
        })

        /* Local state: update in place to avoid requiring a refetch. */
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to overwrite task template'
        setError(message)
        console.error('Error overwriting task template:', err)
        throw err
      }
    },
    [],
  )

  /* Overwrite an existing template with the current draft form state (no task id yet). */
  const overwriteTemplateFromDraft = useCallback(
    async (args: {
      id: string
      name?: string
      icon?: string | null
      included?: TemplateIncludedFields
      title: string
      description: string | null
      priority: Task['priority']
      goal_id: string | null
      time_estimate: number | null
      attachments: Task['attachments']
      recurrence_pattern: string | null
      tags: Task['tags']
      draftChecklists: DraftChecklistInput[]
      draftSubtasks: string[]
    }): Promise<TaskTemplate> => {
      try {
        setError(null)
        const data = buildTemplateDataFromDraft({
          title: args.title,
          description: args.description,
          priority: args.priority,
          goal_id: args.goal_id,
          time_estimate: args.time_estimate,
          attachments: args.attachments ?? [],
          recurrence_pattern: args.recurrence_pattern,
          tags: args.tags ?? [],
          draftChecklists: args.draftChecklists ?? [],
          draftSubtasks: args.draftSubtasks ?? [],
          included: args.included,
        })

        const updated = await updateTaskTemplate(args.id, {
          name: args.name,
          icon: args.icon,
          data,
        })

        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to overwrite task template'
        setError(message)
        console.error('Error overwriting task template from draft:', err)
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
    saveTemplateFromDraft,
    overwriteTemplateFromTask,
    overwriteTemplateFromDraft,
    removeTemplate,
  }
}

