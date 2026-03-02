/* Home dashboard types: Inbox item and related */

/** Inbox item stored in DB (name-only; can be converted to a full task later) */
export interface InboxItem {
  id: string
  user_id: string | null
  name: string
  sort_order: number
  created_at: string
}

/** Input for creating an inbox item */
export interface CreateInboxItemInput {
  user_id?: string | null
  name: string
  sort_order?: number
}

/** Input for updating an inbox item (e.g. rename) */
export interface UpdateInboxItemInput {
  name?: string
  sort_order?: number
}
