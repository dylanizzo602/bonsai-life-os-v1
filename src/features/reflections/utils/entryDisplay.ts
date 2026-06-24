/* Entry display helpers: type labels, badge styles, excerpts, and date formatting for reflection list UI */

import type { ReflectionEntry, MorningBriefingResponses, JournalResponses, GoalReflectionResponses } from '../types'

/** All reflection entry types shown in filter UI */
export const REFLECTION_ENTRY_TYPES = [
  'morning_briefing',
  'journal',
  'weekly_briefing',
  'goal',
] as const

/** Human-readable label for a reflection entry type */
export function getEntryTypeLabel(type: string): string {
  switch (type) {
    case 'morning_briefing':
      return 'Daily Briefing'
    case 'journal':
      return 'Journal'
    case 'weekly_briefing':
      return 'Weekly Review'
    case 'goal':
      return 'Goal'
    default:
      return type
  }
}

/** Tailwind classes for type badge pills (matches mock color mapping) */
export function getEntryTypeBadgeClass(type: string): string {
  switch (type) {
    case 'morning_briefing':
      return 'bg-primary-fixed text-on-primary-fixed-variant'
    case 'journal':
      return 'bg-surface-container-high text-on-surface-variant'
    case 'weekly_briefing':
      return 'bg-secondary-fixed text-on-secondary-fixed-variant'
    case 'goal':
      return 'bg-bonsai-sage-100 text-bonsai-sage-800'
    default:
      return 'bg-surface-container-high text-on-surface-variant'
  }
}

/** Strip HTML tags and collapse whitespace for plain-text previews */
export function stripHtmlToPlainText(html: string): string {
  if (!html?.trim()) return ''
  const withoutTags = html.replace(/<[^>]*>/g, ' ')
  return withoutTags.replace(/\s+/g, ' ').trim()
}

/** Truncate text to a max length with ellipsis */
export function truncateText(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}

/** Build a 2-line preview excerpt from an entry's stored responses */
export function getEntryExcerpt(entry: ReflectionEntry): string {
  if (entry.type === 'journal') {
    const body = (entry.responses as JournalResponses).body ?? ''
    return truncateText(stripHtmlToPlainText(body))
  }

  if (entry.type === 'weekly_briefing') {
    return entry.title
      ? truncateText(`Weekly review completed: ${entry.title}`)
      : 'Weekly review completed.'
  }

  if (entry.type === 'goal') {
    const responses = entry.responses as GoalReflectionResponses
    const plain = stripHtmlToPlainText(responses.whatContributedToSuccess ?? '')
    if (plain) return truncateText(plain)
    return entry.title ? truncateText(`Goal completed: ${entry.title}`) : 'Goal completed.'
  }

  /* Morning briefing: first non-empty answer */
  const responses = entry.responses as MorningBriefingResponses
  const values = [
    responses.memorableMoment,
    responses.gratefulFor,
    responses.didEverything,
    responses.whatWouldMakeEasier,
  ]
  for (const value of values) {
    const plain = stripHtmlToPlainText(value ?? '')
    if (plain) return truncateText(plain)
  }

  return ''
}

/** Format entry date for list rows (e.g. "Oct 24, 2023") */
export function formatEntryDate(createdAt: string): string {
  const d = new Date(createdAt)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Display title fallback when entry has no title */
export function getEntryDisplayTitle(entry: ReflectionEntry): string {
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.type === 'morning_briefing') return 'Morning Briefing'
  if (entry.type === 'weekly_briefing') return 'Weekly Review'
  if (entry.type === 'goal') return entry.title?.trim() || 'Goal Reflection'
  return 'Untitled'
}
