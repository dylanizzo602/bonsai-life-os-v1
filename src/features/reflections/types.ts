/* Reflection types: TypeScript definitions for reflection entries and morning briefing responses */

/** Morning briefing: four reflection questions answered in the briefing flow */
export interface MorningBriefingResponses {
  memorableMoment?: string
  gratefulFor?: string
  didEverything?: string
  whatWouldMakeEasier?: string
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
  type: string
  title?: string | null
  responses: MorningBriefingResponses | Record<string, unknown>
}
