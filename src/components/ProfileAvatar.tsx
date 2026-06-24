/* ProfileAvatar: Reusable user avatar with image or initials fallback */

import { useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { getProfileAvatarUrl, getProfileInitials } from '../features/layout/utils/userDisplay'

type ProfileAvatarSize = 'sm' | 'md' | 'lg'
type ProfileAvatarShape = 'rounded' | 'circle'

interface ProfileAvatarProps {
  /** Supabase auth user; used to resolve avatar URL and initials */
  user?: User | null
  /** Override avatar URL (e.g. optimistic preview) */
  avatarUrl?: string | null
  /** Override initials fallback */
  initials?: string
  /** Visual size preset */
  size?: ProfileAvatarSize
  /** Corner style */
  shape?: ProfileAvatarShape
  /** Extra class names on the outer container */
  className?: string
}

/** Size classes: responsive by default unless size prop is set */
const sizeClasses: Record<ProfileAvatarSize, string> = {
  sm: 'h-12 w-12 text-body',
  md: 'h-16 w-16 text-lg',
  lg: 'h-24 w-24 text-2xl',
}

const shapeClasses: Record<ProfileAvatarShape, string> = {
  rounded: 'rounded-2xl',
  circle: 'rounded-full',
}

/**
 * Displays the user's profile photo when available, otherwise initials.
 * Used in settings, mobile nav, and other account surfaces.
 */
export function ProfileAvatar({
  user = null,
  avatarUrl: avatarUrlOverride,
  initials: initialsOverride,
  size = 'md',
  shape = 'circle',
  className = '',
}: ProfileAvatarProps) {
  /* Resolve display values from user or explicit overrides */
  const resolvedAvatarUrl = useMemo(() => {
    if (avatarUrlOverride !== undefined) return avatarUrlOverride
    return getProfileAvatarUrl(user)
  }, [avatarUrlOverride, user])

  const resolvedInitials = useMemo(() => {
    if (initialsOverride !== undefined) return initialsOverride
    return getProfileInitials(user)
  }, [initialsOverride, user])

  const containerClass = [
    'flex shrink-0 items-center justify-center overflow-hidden border border-outline-variant bg-surface-container-high font-semibold text-primary',
    sizeClasses[size],
    shapeClasses[shape],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClass} aria-hidden>
      {resolvedAvatarUrl ? (
        <img src={resolvedAvatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{resolvedInitials}</span>
      )}
    </div>
  )
}
