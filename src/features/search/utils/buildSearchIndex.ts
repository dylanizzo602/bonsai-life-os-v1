/* buildSearchIndex: Flatten fetched entities into searchable index items */

import type { GoalMilestoneWithGoalName } from '../../../lib/supabase/goals'
import type { Habit } from '../../habits/types'
import type { Goal } from '../../goals/types'
import type { Note, NoteFolder, NotePage } from '../../notes/types'
import type { ReflectionEntry } from '../../reflections/types'
import type { Task } from '../../tasks/types'
import { getBonsaiSearchableTaskPool } from '../../tasks/utils/taskSearch'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import { stripHtmlPreview } from '../../notes/utils/noteDisplayCore'
import type { SearchIndexItem } from '../types'

export interface SearchIndexData {
  tasks: Task[]
  habits: Habit[]
  goals: Goal[]
  milestones: GoalMilestoneWithGoalName[]
  reflections: ReflectionEntry[]
  notes: Note[]
  pagesByNoteId: Record<string, NotePage[]>
  folders: NoteFolder[]
  timeZone: string
}

/** Extract reflection body text for search matching */
function getReflectionSearchText(entry: ReflectionEntry): string {
  const responses = entry.responses
  if (!responses || typeof responses !== 'object') return ''
  const body = (responses as { body?: string }).body
  return typeof body === 'string' ? stripHtmlPreview(body) : ''
}

/** Reflection type label for subtitle */
function getReflectionTypeLabel(type: string): string {
  switch (type) {
    case 'morning_briefing':
      return 'Morning briefing'
    case 'weekly_briefing':
      return 'Weekly briefing'
    case 'journal':
      return 'Journal'
    default:
      return 'Reflection'
  }
}

/** Task status + due subtitle for search results */
function getTaskSubtitle(task: Task, timeZone: string): string {
  const dueText = formatStartDueDisplay(task.start_date, task.due_date, timeZone)
  const statusLabel =
    task.status === 'in_progress'
      ? 'In Progress'
      : task.status === 'completed'
        ? 'Completed'
        : 'Open'
  if (dueText) return `${statusLabel} • ${dueText}`
  return statusLabel
}

/**
 * Build a flat searchable index from fetched entity data.
 */
export function buildSearchIndex(data: SearchIndexData): SearchIndexItem[] {
  const items: SearchIndexItem[] = []
  const folderNameById = new Map(data.folders.map((f) => [f.id, f.name]))

  /* Tasks */
  const searchableTasks = getBonsaiSearchableTaskPool(data.tasks)
  for (const task of searchableTasks) {
    items.push({
      kind: 'task',
      id: task.id,
      title: task.title || 'Untitled task',
      searchText: task.description ?? undefined,
      subtitle: getTaskSubtitle(task, data.timeZone),
    })
  }

  /* Habits */
  for (const habit of data.habits) {
    items.push({
      kind: 'habit',
      id: habit.id,
      title: habit.name,
      searchText: [habit.description, habit.desired_action, habit.minimum_action]
        .filter(Boolean)
        .join(' '),
      subtitle: 'Habit',
    })
  }

  /* Goals */
  for (const goal of data.goals) {
    items.push({
      kind: 'goal',
      id: goal.id,
      title: goal.name,
      searchText: goal.description ?? undefined,
      subtitle: goal.is_active === false ? 'Goal • Paused' : 'Goal',
    })
  }

  /* Milestones */
  for (const milestone of data.milestones) {
    items.push({
      kind: 'milestone',
      id: milestone.id,
      goalId: milestone.goal_id,
      title: milestone.title,
      searchText: milestone.description ?? undefined,
      subtitle: `Milestone • ${milestone.goal_name}`,
    })
  }

  /* Reflections */
  for (const entry of data.reflections) {
    const body = getReflectionSearchText(entry)
    items.push({
      kind: 'reflection',
      id: entry.id,
      title: entry.title?.trim() || getReflectionTypeLabel(entry.type),
      searchText: body || undefined,
      subtitle: getReflectionTypeLabel(entry.type),
    })
  }

  /* Note folders */
  for (const folder of data.folders) {
    items.push({
      kind: 'note_folder',
      id: folder.id,
      title: folder.name,
      subtitle: 'Notes folder',
    })
  }

  /* Notes and pages (one index entry per note title + per page) */
  for (const note of data.notes) {
    const folderName = note.folder_id ? folderNameById.get(note.folder_id) : null
    const noteSubtitle = folderName ? `Note • ${folderName}` : 'Note'

    items.push({
      kind: 'note',
      id: note.id,
      title: note.title?.trim() || 'Untitled',
      subtitle: noteSubtitle,
    })

    const pages = data.pagesByNoteId[note.id] ?? []
    const docTitle = note.title?.trim() || 'Untitled'
    for (const page of pages) {
      const pageTitle = page.title?.trim() || 'Untitled page'
      const body = stripHtmlPreview(page.content)

      /* Skip duplicate if page title matches note title and body is empty */
      if (pageTitle.toLowerCase() === docTitle.toLowerCase() && !body) continue

      items.push({
        kind: 'note',
        id: note.id,
        pageId: page.id,
        title: pageTitle,
        searchText: body || undefined,
        subtitle: `Page in ${docTitle}`,
      })
    }
  }

  return items
}
