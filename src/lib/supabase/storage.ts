/* Task attachment storage: Upload files to Supabase Storage for task attachments */

import { supabase } from './client'
import type { TaskAttachment } from '../../features/tasks/types'

const BUCKET = 'task-attachments'

const IDENTITY_BADGES_BUCKET = 'identity-badges'

/**
 * Upload a file as an attachment for a task.
 * Stores under taskId/filename. Returns public URL and metadata.
 * Bucket must exist and have RLS allowing uploads (create via Supabase dashboard or migration).
 */
export async function uploadTaskAttachment(
  taskId: string,
  file: File,
): Promise<TaskAttachment> {
  const ext = file.name.split('.').pop() ?? ''
  const base = file.name.slice(0, -(ext.length + (ext ? 1 : 0)))
  const safeName = `${base}-${Date.now()}${ext ? '.' + ext : ''}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${taskId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })

  if (uploadError) {
    console.error('Error uploading attachment:', uploadError)
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error(
        `Storage bucket "${BUCKET}" not found. Create it in Supabase Dashboard → Storage → New bucket (name: ${BUCKET}, public: true).`,
      )
    }
    throw uploadError
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type || undefined,
  }
}

export interface IdentityBadgeUpload {
  /** Public URL for the uploaded badge image */
  url: string
  /** Original filename (for display) */
  name: string
  /** Mime type when available */
  type?: string
  /** Supabase storage path (to persist in DB) */
  storagePath: string
}

/**
 * Identity badge upload: upload and return public URL + storage path.
 *
 * Badge images are stored under: `${identityId}/${safeName}`
 * Bucket should be public so the app can display the image without auth.
 */
export async function uploadIdentityBadge(
  identityId: string,
  file: File,
): Promise<IdentityBadgeUpload> {
  const ext = file.name.split('.').pop() ?? ''
  const base = file.name.slice(0, -(ext.length + (ext ? 1 : 0)))
  const safeName = `${base}-${Date.now()}${ext ? '.' + ext : ''}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${identityId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(IDENTITY_BADGES_BUCKET)
    .upload(path, file, { upsert: false })

  if (uploadError) {
    console.error('Error uploading identity badge:', uploadError)
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error(
        `Storage bucket "${IDENTITY_BADGES_BUCKET}" not found. Create it in Supabase Dashboard → Storage (public: true, name: ${IDENTITY_BADGES_BUCKET}).`,
      )
    }
    throw uploadError
  }

  const { data: urlData } = supabase.storage.from(IDENTITY_BADGES_BUCKET).getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type || undefined,
    storagePath: path,
  }
}
