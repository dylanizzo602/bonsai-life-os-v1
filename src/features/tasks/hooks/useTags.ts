/* useTags hook: Custom React hook for tag data management and operations */
import { useState, useCallback } from 'react'
import {
  getTags,
  searchTags,
  createTag,
  updateTag,
  addTagToTask,
  removeTagFromTask,
  deleteTagFromAllTasks,
  setTagsForTask,
} from '../../../lib/supabase/tags'
import type { Tag, TagColorId } from '../types'

/**
 * Custom hook for managing tags.
 * Provides tag search, create, and task-tag assignment operations.
 */
export function useTags(userId?: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Fetch all tags */
  const fetchTags = useCallback(async (): Promise<Tag[]> => {
    try {
      setLoading(true)
      setError(null)
      return await getTags(userId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tags'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  /* Search tags by name */
  const handleSearchTags = useCallback(
    async (query: string): Promise<Tag[]> => {
      try {
        setError(null)
        return await searchTags(query, userId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to search tags'
        setError(msg)
        throw err
      }
    },
    [userId],
  )

  /* Create a new tag */
  const handleCreateTag = useCallback(
    async (name: string, color: TagColorId): Promise<Tag> => {
      try {
        setError(null)
        return await createTag(name, color, userId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create tag'
        setError(msg)
        throw err
      }
    },
    [userId],
  )

  /* Update an existing tag (name and/or color) */
  const handleUpdateTag = useCallback(
    async (tagId: string, updates: { name?: string; color?: TagColorId }): Promise<Tag> => {
      try {
        setError(null)
        return await updateTag(tagId, updates)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update tag'
        setError(msg)
        throw err
      }
    },
    [],
  )

  /* Add tag to task */
  const handleAddTagToTask = useCallback(async (taskId: string, tagId: string) => {
    try {
      setError(null)
      await addTagToTask(taskId, tagId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add tag'
      setError(msg)
      throw err
    }
  }, [])

  /* Remove tag from task */
  const handleRemoveTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    try {
      setError(null)
      await removeTagFromTask(taskId, tagId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove tag'
      setError(msg)
      throw err
    }
  }, [])

  /* Delete tag from all tasks */
  const handleDeleteTagFromAllTasks = useCallback(async (tagId: string) => {
    try {
      setError(null)
      await deleteTagFromAllTasks(tagId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete tag'
      setError(msg)
      throw err
    }
  }, [])

  /* Set all tags for a task (replaces existing) */
  const handleSetTagsForTask = useCallback(async (taskId: string, tagIds: string[]) => {
    try {
      setError(null)
      await setTagsForTask(taskId, tagIds)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set tags'
      setError(msg)
      throw err
    }
  }, [])

  return {
    loading,
    error,
    fetchTags,
    searchTags: handleSearchTags,
    createTag: handleCreateTag,
    updateTag: handleUpdateTag,
    addTagToTask: handleAddTagToTask,
    removeTagFromTask: handleRemoveTagFromTask,
    deleteTagFromAllTasks: handleDeleteTagFromAllTasks,
    setTagsForTask: handleSetTagsForTask,
  }
}
