/* Reflection types: TypeScript definitions for reflection entries and morning briefing responses */

/** Known reflection entry types stored in reflection_entries.type */
export type ReflectionEntryType =
  | 'morning_briefing'
  | 'weekly_briefing'
  | 'journal'
  | 'goal'

/** Goal completion reflection: captured when a goal reaches 100% progress */
export interface GoalReflectionResponses {
  /** Source goal id for linking and deduplication */
  goalId?: string
  whatContributedToSuccess?: string
}

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
  responses: MorningBriefingResponses | GoalReflectionResponses | Record<string, unknown>
  created_at: string
}

/** Input for creating a reflection entry */
export interface CreateReflectionEntryInput {
  user_id?: string | null
  type: ReflectionEntryType | string
  title?: string | null
  responses:
    | MorningBriefingResponses
    | JournalResponses
    | GoalReflectionResponses
    | Record<string, unknown>
}

/** Input for updating an existing reflection entry */
export interface UpdateReflectionEntryInput {
  title?: string | null
  responses?:
    | MorningBriefingResponses
    | JournalResponses
    | GoalReflectionResponses
    | Record<string, unknown>
  /** Optional entry date override (ISO timestamp) */
  created_at?: string
}
