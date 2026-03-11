/* Task templates data access layer: Supabase queries for CRUD on task_templates */
import { supabase } from './client'
import type { TaskTemplate, TaskTemplateData } from '../../features/tasks/types'

/** Fetch all task templates for the current user, ordered by most recently created. */
export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching task templates:', error)
    throw error
  }

  return (data as TaskTemplate[]) ?? []
}

/** Create a new task template with the given name and data snapshot. */
export async function createTaskTemplate(input: {
  name: string
  data: TaskTemplateData
}): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      name: input.name,
      data: input.data,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating task template:', error)
    throw error
  }

  return data as TaskTemplate
}

/** Delete an existing task template by id. */
export async function deleteTaskTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('task_templates').delete().eq('id', id)

  if (error) {
    console.error('Error deleting task template:', error)
    throw error
  }
}

