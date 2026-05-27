/* taskTemplateData helpers: Build TaskTemplateData snapshots from tasks or draft form state */
import type { Task, TaskAttachment, TaskPriority, Tag, TaskTemplateData } from '../types'

export interface TemplateIncludedFields {
  /** Save description text */
  description: boolean
  /** Save checklists and their items */
  checklists: boolean
  /** Save subtasks (and optional subtask checklists when source supports them) */
  subtasks: boolean
  /** Save tags/labels */
  tags: boolean
  /** Save recurrence pattern (dates themselves are intentionally ignored on apply) */
  repeatingSettings: boolean
  /** Save attachments */
  attachments: boolean
  /** Save time estimate */
  timeEstimates: boolean
  /** Save goal link */
  goal: boolean
  /** Save priority */
  priority: boolean
}

export const DEFAULT_TEMPLATE_INCLUDED_FIELDS: TemplateIncludedFields = {
  description: true,
  checklists: true,
  subtasks: true,
  tags: true,
  repeatingSettings: true,
  attachments: true,
  timeEstimates: true,
  goal: true,
  priority: true,
}

export interface DraftChecklistItemInput {
  title: string
  completed?: boolean
}

export interface DraftChecklistInput {
  title: string
  items: DraftChecklistItemInput[]
}

/**
 * Build a template payload from current draft form state.
 * This is used when saving a template while creating a new task (no task id yet).
 */
export function buildTemplateDataFromDraft(args: {
  title: string
  description: string | null
  priority: TaskPriority
  goal_id: string | null
  time_estimate: number | null
  attachments: TaskAttachment[]
  recurrence_pattern: string | null
  tags: Tag[]
  draftChecklists: DraftChecklistInput[]
  draftSubtasks: string[]
  included?: TemplateIncludedFields
}): TaskTemplateData {
  /* Included fields: default to “save everything we currently support”. */
  const included = args.included ?? DEFAULT_TEMPLATE_INCLUDED_FIELDS

  /* Checklist snapshots: store titles + completion state (no ids). */
  const checklists: TaskTemplateData['checklists'] = included.checklists
    ? args.draftChecklists.map((cl) => ({
        title: cl.title,
        items: (cl.items ?? []).map((item) => ({
          title: item.title,
          completed: Boolean(item.completed),
        })),
      }))
    : []

  /* Subtask snapshots: drafts only track a title; fill other fields with safe defaults. */
  const subtasks: TaskTemplateData['subtasks'] = included.subtasks
    ? args.draftSubtasks
        .map((t) => t.trim())
        .filter(Boolean)
        .map((title) => ({
          title,
          description: null,
          priority: 'medium',
          time_estimate: null,
          recurrence_pattern: null,
          checklists: [],
        }))
    : []

  return {
    title: args.title,
    description: included.description ? args.description : null,
    priority: included.priority ? args.priority : 'medium',
    goal_id: included.goal ? args.goal_id : null,
    time_estimate: included.timeEstimates ? args.time_estimate : null,
    attachments: included.attachments ? args.attachments : [],
    category: null,
    recurrence_pattern: included.repeatingSettings ? args.recurrence_pattern : null,
    tags: included.tags ? args.tags : [],
    checklists,
    subtasks,
  }
}

/** Remove fields from a saved template payload according to the Included Fields selection. */
export function filterTemplateDataByIncludedFields(
  data: TaskTemplateData,
  included: TemplateIncludedFields,
): TaskTemplateData {
  return {
    ...data,
    description: included.description ? data.description : null,
    priority: included.priority ? data.priority : 'medium',
    goal_id: included.goal ? data.goal_id : null,
    time_estimate: included.timeEstimates ? data.time_estimate : null,
    attachments: included.attachments ? data.attachments : [],
    recurrence_pattern: included.repeatingSettings ? data.recurrence_pattern : null,
    tags: included.tags ? data.tags : [],
    checklists: included.checklists ? data.checklists : [],
    subtasks: included.subtasks ? data.subtasks : [],
  }
}

/**
 * Build a human-friendly 1-line summary for Library rows.
 * This stays UI-only: it does not change stored data.
 */
export function getTemplateSummaryLine(data: TaskTemplateData): string {
  /* Summary line: show small “contents” hint without needing a full preview panel. */
  const parts: string[] = []
  if (data.description) parts.push('Description')
  if (data.tags && data.tags.length > 0) parts.push(`${data.tags.length} tags`)
  if (data.checklists && data.checklists.length > 0) parts.push(`${data.checklists.length} checklists`)
  if (data.subtasks && data.subtasks.length > 0) parts.push(`${data.subtasks.length} subtasks`)
  if (data.recurrence_pattern) parts.push('Repeats')
  if (data.time_estimate != null) parts.push('Estimate')
  if (parts.length === 0) return 'Basic fields only.'
  return parts.join(' • ')
}

/**
 * Build a template payload from an existing Task row (without checklists/subtasks).
 * Useful for fast previews; full snapshots should include checklists/subtasks from their sources.
 */
export function buildTemplateDataFromTaskCore(task: Task): Omit<TaskTemplateData, 'checklists' | 'subtasks'> {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    goal_id: task.goal_id,
    time_estimate: task.time_estimate,
    attachments: task.attachments ?? [],
    category: task.category,
    recurrence_pattern: task.recurrence_pattern,
    tags: task.tags ?? [],
  }
}

