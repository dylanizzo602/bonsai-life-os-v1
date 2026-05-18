/* userDisplay: Shared display helpers for profile name, avatar, and plan label */

import type { User } from '@supabase/supabase-js'

/** Full display name from metadata, or email local-part fallback */
export function getProfileDisplayName(user: User | null): string {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  const first = typeof metadata.first_name === 'string' ? metadata.first_name.trim() : ''
  const last = typeof metadata.last_name === 'string' ? metadata.last_name.trim() : ''
  const full = `${first} ${last}`.trim()
  if (full) return full
  const email = user?.email?.trim()
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return 'Account'
}

/** Up to two initials for avatar fallback */
export function getProfileInitials(user: User | null): string {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  const first = typeof metadata.first_name === 'string' ? metadata.first_name.trim() : ''
  const last = typeof metadata.last_name === 'string' ? metadata.last_name.trim() : ''
  const a = (first[0] ?? '').toUpperCase()
  const b = (last[0] ?? '').toUpperCase()
  if (a || b) return (a + b).slice(0, 2)
  const email = user?.email?.trim()
  if (email) return (email[0] ?? '?').toUpperCase()
  return '?'
}

/** Avatar URL from metadata when available (OAuth or uploaded) */
export function getProfileAvatarUrl(user: User | null): string | null {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  if (typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()) {
    return metadata.avatar_url.trim()
  }
  if (typeof metadata.picture === 'string' && metadata.picture.trim()) {
    return metadata.picture.trim()
  }
  return null
}

/** Plan label for nav/profile until billing is wired */
export function getSubscriptionPlanLabel(_user: User | null): string {
  return 'Pro Plan'
}
