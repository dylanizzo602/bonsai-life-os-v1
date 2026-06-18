/* Reflection types: TypeScript definitions for reflection entries and morning briefing responses */

/** Known reflection entry types stored in reflection_entries.type */
export type ReflectionEntryType = 'morning_briefing' | 'weekly_briefing' | 'journal'

/** Journal entry: freeform rich-text body */
export interface JournalResponses {
  body?: string
}

/** Morning briefing: reflection questions answered in the briefing flow */
export interface MorningBriefingResponses {
  memorableMoment?: string
  gratefulFor?: string
  /** @deprecated Replaced by habit review step; kept for legacy entries */
  didEverything?: string
  whatWouldMakeEasier?: string
  /** Habit skip review: what got in the way yesterday */
  habitsGotInTheWay?: string
  /** Habit skip review: what to do differently today */
  habitsDoDifferentlyToday?: string
  /** @deprecated Removed from morning briefing flow */
  weekHighlights?: string
  /** @deprecated Removed from morning briefing flow */
  weekImprove?: string
}

/** Reflection entry stored in DB (e.g. one completed morning briefing) */
export interface ReflectionEntry {
  id: string
  user_id: string | null
  type: string
  title: string | null
  responses: MorningBriefingResponses | Record<string, unknown>
  created_at: string
}

/** Input for creating a reflection entry */
export interface CreateReflectionEntryInput {
  user_id?: string | null
  type: ReflectionEntryType | string
  title?: string | null
  responses: MorningBriefingResponses | JournalResponses | Record<string, unknown>
}

/** Input for updating an existing reflection entry */
export interface UpdateReflectionEntryInput {
  title?: string | null
  responses?: MorningBriefingResponses | JournalResponses | Record<string, unknown>
  /** Optional entry date override (ISO timestamp) */
  created_at?: string
}
