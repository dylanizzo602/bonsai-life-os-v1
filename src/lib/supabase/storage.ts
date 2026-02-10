/* Task attachment storage: Upload files to Supabase Storage for task attachments */

import { supabase } from './client'
import type { TaskAttachment } from '../../features/tasks/types'

const BUCKET = 'task-attachments'

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
    throw uploadError
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type || undefined,
  }
}
