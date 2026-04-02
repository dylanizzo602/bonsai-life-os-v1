/* Timezone helpers: resolve the user's IANA zone from profile metadata with safe fallbacks */
import { DateTime } from 'luxon'

/** Curated IANA zones for the settings dropdown (label + value). Empty value = use device zone. */
export const PROFILE_TIME_ZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Use device timezone' },
  { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Phoenix', label: 'Mountain — Arizona (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
  { value: 'America/Toronto', label: 'Eastern (Toronto)' },
  { value: 'America/Vancouver', label: 'Pacific (Vancouver)' },
  { value: 'Europe/London', label: 'UK (London)' },
  { value: 'Europe/Paris', label: 'Central Europe (Paris)' },
  { value: 'Europe/Berlin', label: 'Central Europe (Berlin)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Auckland)' },
  { value: 'UTC', label: 'UTC' },
]

/**
 * Resolve the effective IANA timezone for the signed-in user.
 * Uses `time_zone` from Supabase user_metadata when set and valid; otherwise the browser's zone.
 */
export function getEffectiveTimeZoneFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  /* Read optional profile override */
  const raw = metadata?.time_zone
  if (typeof raw === 'string' && raw.trim()) {
    const tz = raw.trim()
    if (DateTime.now().setZone(tz).isValid) return tz
  }
  /* Fallback: device / browser zone */
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
