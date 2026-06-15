/* modalChecklistTypes: Shared draft checklist types for task modals */

export type DraftChecklistItem = { id: string; title: string; completed: boolean }
export type DraftChecklist = { id: string; title: string; items: DraftChecklistItem[] }

/** Generate a stable local id for draft checklist rows before the task exists */
export function newDraftChecklistId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
