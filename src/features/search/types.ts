/* Search types: Global search result shapes */

import type { SearchOpenIntent } from './searchOpenIntent'

/** Entity kinds searchable from the global search panel */
export type SearchResultKind =
  | 'task'
  | 'habit'
  | 'goal'
  | 'milestone'
  | 'reflection'
  | 'note'
  | 'note_folder'

/** One searchable record in the global index */
export interface SearchIndexItem {
  kind: SearchResultKind
  id: string
  title: string
  /** Extra text used for matching (description, body, etc.) */
  searchText?: string
  subtitle?: string
  /** Optional payload for navigation */
  goalId?: string
  pageId?: string
}

/** Ranked search result shown in the panel */
export interface SearchResult extends SearchIndexItem {
  score: number
}

/** Quick action ids in the search panel */
export type SearchQuickActionId = 'task' | 'inbox' | 'note' | 'habit'

export interface SearchQuickAction {
  id: SearchQuickActionId
  label: string
  icon: string
}

export const SEARCH_QUICK_ACTIONS: SearchQuickAction[] = [
  { id: 'task', label: 'New Task', icon: 'add_task' },
  { id: 'inbox', label: 'Add to Inbox', icon: 'center_focus_strong' },
  { id: 'note', label: 'New Note', icon: 'edit_note' },
  { id: 'habit', label: 'Log Habit', icon: 'auto_awesome' },
]

/** Map a search result to a navigation open intent */
export function searchResultToOpenIntent(result: SearchIndexItem): SearchOpenIntent {
  switch (result.kind) {
    case 'task':
      return { kind: 'task', id: result.id }
    case 'habit':
      return { kind: 'habit', id: result.id }
    case 'goal':
      return { kind: 'goal', id: result.id }
    case 'milestone':
      return {
        kind: 'milestone',
        goalId: result.goalId ?? result.id,
        milestoneId: result.id,
      }
    case 'reflection':
      return { kind: 'reflection', id: result.id }
    case 'note':
      return { kind: 'note', id: result.id, pageId: result.pageId }
    case 'note_folder':
      return { kind: 'note_folder', id: result.id }
  }
}

/** Material icon name per result kind */
export const SEARCH_RESULT_ICONS: Record<SearchResultKind, string> = {
  task: 'check_circle',
  habit: 'auto_awesome',
  goal: 'flag',
  milestone: 'milestone',
  reflection: 'self_improvement',
  note: 'description',
  note_folder: 'folder_open',
}

/** Human-readable entity label for result subtitles */
export const SEARCH_RESULT_LABELS: Record<SearchResultKind, string> = {
  task: 'Task',
  habit: 'Habit',
  goal: 'Goal',
  milestone: 'Milestone',
  reflection: 'Reflection',
  note: 'Note',
  note_folder: 'Folder',
}
