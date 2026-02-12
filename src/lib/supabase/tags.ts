/* Tag data access layer: Supabase queries for tags and task-tag assignments */
import { supabase } from './client'
import type { Tag, TagColorId } from '../../features/tasks/types'

/**
 * Fetch all tags for a user (or all if no user_id).
 * Used for search/list in TagModal.
 */
export async function getTags(userId?: string | null): Promise<Tag[]> {
  let query = supabase.from('tags').select('*').order('name', { ascending: true })

  if (userId !== undefined && userId !== null && userId !== '') {
    query = query.or(`user_id.eq.${userId},user_id.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tags:', error)
    throw error
  }

  return (data as Tag[]) ?? []
}

/**
 * Fetch tags assigned to a specific task.
 */
export async function getTagsForTask(taskId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('task_tags')
    .select('tags(*)')
    .eq('task_id', taskId)

  if (error) {
    console.error('Error fetching tags for task:', error)
    throw error
  }

  /* Extract Tag from task_tags rows (each row has tags: Tag | null) */
  const rows = (data as unknown as { tags: Tag | null }[] | null) ?? []
  return rows.map((row) => row.tags).filter((t): t is Tag => t != null)
}

/**
 * Search tags by name (case-insensitive).
 */
export async function searchTags(query: string, userId?: string | null): Promise<Tag[]> {
  if (!query.trim()) return getTags(userId)

  let dbQuery = supabase
    .from('tags')
    .select('*')
    .ilike('name', `%${query.trim()}%`)
    .order('name', { ascending: true })

  if (userId !== undefined && userId !== null) {
    dbQuery = dbQuery.or(`user_id.eq.${userId},user_id.is.null`)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error('Error searching tags:', error)
    throw error
  }

  return (data as Tag[]) ?? []
}

/**
 * Create a new tag.
 */
export async function createTag(name: string, color: TagColorId, userId?: string | null): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({
      name: name.trim(),
      color,
      user_id: userId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tag:', error)
    throw error
  }

  return data as Tag
}

/**
 * Update an existing tag's name and/or color.
 */
export async function updateTag(
  id: string,
  updates: { name?: string; color?: TagColorId },
): Promise<Tag> {
  const updateData: Record<string, unknown> = {}
  if (updates.name !== undefined) updateData.name = updates.name.trim()
  if (updates.color !== undefined) updateData.color = updates.color

  if (Object.keys(updateData).length === 0) {
    const { data } = await supabase.from('tags').select('*').eq('id', id).single()
    return data as Tag
  }

  const { data, error } = await supabase
    .from('tags')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating tag:', error)
    throw error
  }

  return data as Tag
}

/**
 * Add a tag to a task. Enforces max 3 tags per task (caller should check).
 */
export async function addTagToTask(taskId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('task_tags').insert({
    task_id: taskId,
    tag_id: tagId,
  })

  if (error) {
    console.error('Error adding tag to task:', error)
    throw error
  }
}

/**
 * Remove a tag from a task.
 */
export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tagId)

  if (error) {
    console.error('Error removing tag from task:', error)
    throw error
  }
}

/**
 * Delete a tag from all tasks and remove the tag itself.
 * Caller should confirm with user before invoking.
 */
export async function deleteTagFromAllTasks(tagId: string): Promise<void> {
  /* task_tags has ON DELETE CASCADE from tags, so deleting the tag removes all task_tags */
  const { error } = await supabase.from('tags').delete().eq('id', tagId)

  if (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
}

/**
 * Set all tags for a task (replaces existing). Used when saving from modal.
 * Enforces max 3 tags.
 */
export async function setTagsForTask(taskId: string, tagIds: string[]): Promise<void> {
  const limited = tagIds.slice(0, 3)

  /* Delete existing task_tags for this task */
  const { error: deleteError } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)

  if (deleteError) {
    console.error('Error clearing task tags:', deleteError)
    throw deleteError
  }

  /* Insert new associations */
  if (limited.length > 0) {
    const rows = limited.map((tag_id) => ({ task_id: taskId, tag_id }))
    const { error: insertError } = await supabase.from('task_tags').insert(rows)

    if (insertError) {
      console.error('Error setting task tags:', insertError)
      throw insertError
    }
  }
}
