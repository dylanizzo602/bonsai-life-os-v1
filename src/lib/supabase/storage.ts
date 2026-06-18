/* Task attachment storage: Upload files to Supabase Storage for task attachments */

import { supabase, supabaseUrl } from './client'
import type { TaskAttachment } from '../../features/tasks/types'

const BUCKET = 'task-attachments'

/** Supabase anon key for direct storage REST uploads (progress reporting). */
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

/** Build a unique storage path for a task attachment file. */
function buildAttachmentPath(taskId: string, file: File): string {
  const ext = file.name.split('.').pop() ?? ''
  const base = file.name.slice(0, -(ext.length + (ext ? 1 : 0)))
  const safeName = `${base}-${Date.now()}${ext ? '.' + ext : ''}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${taskId}/${safeName}`
}

const IDENTITY_BADGES_BUCKET = 'identity-badges'

/** Encode each storage path segment for the Supabase REST upload URL. */
function encodeStoragePath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

/** Resolve the bearer token for storage uploads (session JWT when signed in, else anon key). */
async function getStorageAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token
  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key missing; cannot upload attachments.')
  }
  return supabaseAnonKey
}

/**
 * Upload via the Supabase JS client (no progress events; used as a reliable fallback).
 */
async function uploadTaskAttachmentViaClient(
  path: string,
  file: File,
): Promise<TaskAttachment> {
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

/**
 * Upload a file with optional progress and abort support (XHR to Supabase Storage REST API).
 * Falls back to the Supabase client when XHR fails (network/CORS/auth edge cases).
 */
export async function uploadTaskAttachmentWithProgress(
  taskId: string,
  file: File,
  options?: {
    onProgress?: (percent: number) => void
    signal?: AbortSignal
  },
): Promise<TaskAttachment> {
  const path = buildAttachmentPath(taskId, file)
  const authToken = await getStorageAuthToken()
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`

  try {
    return await new Promise<TaskAttachment>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      /* Abort: cancel in-flight upload when the caller aborts the signal */
      const onAbort = () => {
        xhr.abort()
      }
      if (options?.signal) {
        if (options.signal.aborted) {
          reject(new DOMException('Upload aborted', 'AbortError'))
          return
        }
        options.signal.addEventListener('abort', onAbort)
      }

      /* Progress: report upload percentage when the browser can compute it */
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options?.onProgress) {
          options.onProgress(Math.round((event.loaded / event.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        options?.signal?.removeEventListener('abort', onAbort)
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
          resolve({
            url: urlData.publicUrl,
            name: file.name,
            type: file.type || undefined,
          })
          return
        }

        let message = xhr.statusText || 'Upload failed'
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string; error?: string }
          message = body.message ?? body.error ?? message
        } catch {
          /* Use status text when response is not JSON */
        }

        if (message.includes('Bucket not found') || message.includes('not found')) {
          reject(
            new Error(
              `Storage bucket "${BUCKET}" not found. Create it in Supabase Dashboard → Storage → New bucket (name: ${BUCKET}, public: true).`,
            ),
          )
          return
        }

        reject(new Error(message))
      })

      xhr.addEventListener('error', () => {
        options?.signal?.removeEventListener('abort', onAbort)
        reject(new Error('Upload failed'))
      })

      xhr.addEventListener('abort', () => {
        options?.signal?.removeEventListener('abort', onAbort)
        reject(new DOMException('Upload aborted', 'AbortError'))
      })

      xhr.open('POST', uploadUrl)
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
      xhr.setRequestHeader('apikey', supabaseAnonKey)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.send(file)
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }

    /* Fallback: use the Supabase client upload path that worked before the progress UI */
    options?.onProgress?.(0)
    const attachment = await uploadTaskAttachmentViaClient(path, file)
    options?.onProgress?.(100)
    return attachment
  }
}

/**
 * Upload a file as an attachment for a task.
 * Stores under taskId/filename. Returns public URL and metadata.
 * Bucket must exist and have RLS allowing uploads (create via Supabase dashboard or migration).
 */
export async function uploadTaskAttachment(
  taskId: string,
  file: File,
): Promise<TaskAttachment> {
  return uploadTaskAttachmentWithProgress(taskId, file)
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

const NOTE_COVERS_BUCKET = 'note-covers'

export interface NoteCoverUpload {
  /** Public URL for the uploaded cover image */
  url: string
  /** Original filename (for display) */
  name: string
  /** Mime type when available */
  type?: string
  /** Supabase storage path (to persist in DB) */
  storagePath: string
}

/**
 * Note cover upload: stores under `${userId}/${noteId}/${safeName}`.
 * Bucket must be public so cards can display covers without auth.
 */
export async function uploadNoteCover(noteId: string, file: File): Promise<NoteCoverUpload> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be signed in to upload a cover image.')
  }

  const ext = file.name.split('.').pop() ?? ''
  const base = file.name.slice(0, -(ext.length + (ext ? 1 : 0)))
  const safeName = `${base}-${Date.now()}${ext ? '.' + ext : ''}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${noteId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(NOTE_COVERS_BUCKET)
    .upload(path, file, { upsert: false })

  if (uploadError) {
    console.error('Error uploading note cover:', uploadError)
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error(
        `Storage bucket "${NOTE_COVERS_BUCKET}" not found. Run supabase db push to create it.`,
      )
    }
    throw uploadError
  }

  const { data: urlData } = supabase.storage.from(NOTE_COVERS_BUCKET).getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type || undefined,
    storagePath: path,
  }
}

/**
 * Delete a note cover file from storage by its storage path.
 */
export async function deleteNoteCover(storagePath: string): Promise<void> {
  if (!storagePath.trim()) return

  const { error } = await supabase.storage.from(NOTE_COVERS_BUCKET).remove([storagePath])

  if (error) {
    console.error('Error deleting note cover:', error)
    throw error
  }
}

const FEEDBACK_SCREENSHOTS_BUCKET = 'feedback-screenshots'

/** Build a unique storage path for a feedback screenshot under the user's folder. */
function buildFeedbackScreenshotPath(userId: string, file: File): string {
  const ext = file.name.split('.').pop() ?? ''
  const base = file.name.slice(0, -(ext.length + (ext ? 1 : 0)))
  const safeName = `${base}-${Date.now()}${ext ? '.' + ext : ''}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/${safeName}`
}

/**
 * Upload an optional bug-report screenshot to the private feedback-screenshots bucket.
 * Returns the storage path for the edge function to attach to the email.
 */
export async function uploadFeedbackScreenshot(userId: string, file: File): Promise<string> {
  const path = buildFeedbackScreenshotPath(userId, file)

  const { error: uploadError } = await supabase.storage
    .from(FEEDBACK_SCREENSHOTS_BUCKET)
    .upload(path, file, { upsert: false })

  if (uploadError) {
    console.error('Error uploading feedback screenshot:', uploadError)
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error(
        `Storage bucket "${FEEDBACK_SCREENSHOTS_BUCKET}" not found. Run supabase db push to create it.`,
      )
    }
    throw uploadError
  }

  return path
}
