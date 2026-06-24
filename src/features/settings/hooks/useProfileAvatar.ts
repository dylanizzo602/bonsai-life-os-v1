/* useProfileAvatar hook: Upload user profile photos */

import { useCallback, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getAuthErrorMessage, updateAccountAvatarMetadata } from '../../../lib/supabase/account'
import { deleteProfileAvatar, uploadProfileAvatar } from '../../../lib/supabase/storage'
import { getProfileAvatarUrl } from '../../layout/utils/userDisplay'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_AVATAR_BYTES = 10 * 1024 * 1024

/** Read avatar_storage_path from user metadata */
function getAvatarStoragePath(user: User | null): string | null {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  if (typeof metadata.avatar_storage_path === 'string' && metadata.avatar_storage_path.trim()) {
    return metadata.avatar_storage_path.trim()
  }
  return null
}

/** Validate file type and size before upload */
function validateAvatarFile(file: File): void {
  const mime = file.type.trim().toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new Error('Please choose a JPEG, PNG, WebP, or GIF image.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Profile photo must be 10 MB or smaller.')
  }
}

interface UseProfileAvatarReturn {
  /** Current display URL (custom upload or OAuth) */
  avatarUrl: string | null
  /** True while upload is in flight */
  uploading: boolean
  /** Last error message */
  error: string | null
  /** Clear the error message */
  clearError: () => void
  /** Upload a new profile photo (replaces previous upload) */
  uploadAvatar: (file: File) => Promise<void>
}

/**
 * Manages profile photo upload for the Settings page.
 * Uploads immediately to storage and persists URL in auth metadata.
 */
export function useProfileAvatar(user: User | null): UseProfileAvatarReturn {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Derived avatar state from auth user */
  const avatarUrl = useMemo(() => getProfileAvatarUrl(user), [user])
  const avatarStoragePath = useMemo(() => getAvatarStoragePath(user), [user])

  /* Error reset */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /* Upload: validate, replace old file, persist metadata */
  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) return
      try {
        setUploading(true)
        setError(null)
        validateAvatarFile(file)

        if (avatarStoragePath) {
          try {
            await deleteProfileAvatar(avatarStoragePath)
          } catch {
            /* Best-effort cleanup; continue with new upload */
          }
        }

        const uploaded = await uploadProfileAvatar(file)
        await updateAccountAvatarMetadata({
          avatarUrl: uploaded.url,
          avatarStoragePath: uploaded.storagePath,
        })
      } catch (err) {
        const message = getAuthErrorMessage(err, 'Failed to upload profile photo')
        setError(message)
        throw err
      } finally {
        setUploading(false)
      }
    },
    [user, avatarStoragePath],
  )

  return {
    avatarUrl,
    uploading,
    error,
    clearError,
    uploadAvatar,
  }
}
