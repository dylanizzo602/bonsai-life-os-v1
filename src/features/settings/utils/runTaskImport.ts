/* Task import runner: Write canonical records to Supabase with merge support and revert tracking */
import {
  createTask,
  updateTask,
  deleteTask,
  createTaskChecklist,
  createChecklistItem,
  createTaskDependency,
  getTaskChecklists,
  getTaskChecklistItems,
  getTaskDependencies,
  getTasks,
  toggleChecklistItemComplete,
  deleteTaskChecklist,
  deleteTaskDependency,
  setTaskImportTimestamps,
} from '../../../lib/supabase/tasks'
import { createTag, getTags, setTagsForTask, deleteTagFromAllTasks } from '../../../lib/supabase/tags'
import {
  addTaskToMilestone,
  findMilestoneIdByTitles,
  getMilestoneLinksForTaskIds,
  getGoals,
} from '../../../lib/supabase/goals'
import { getHabits } from '../../../lib/supabase/habits'
import { DEFAULT_TAG_COLOR, type TagColorId } from '../../tasks/utils/tagColors'
import type { CanonicalTaskRecord } from '../../tasks/utils/taskImportExport'
import type { ImportMode, TasksRevertPayload } from '../types/importExport'
import type { Task } from '../../tasks/types'

export interface TaskImportResult {
  totalRows: number
  createdTasks: number
  updatedTasks: number
  createdChecklists: number
  createdChecklistItems: number
  createdDependencies: number
  createdTags: number
  errors: string[]
  warnings: string[]
  revertPayload: TasksRevertPayload | null
}

/* Build lookup maps for goal/habit references */
async function buildReferenceMaps() {
  const [goals, habits] = await Promise.all([getGoals(), getHabits()])
  const goalIdByTitle = new Map(
    goals.map((g) => [g.name.trim().toLowerCase(), g.id]),
  )
  const habitIdByName = new Map(
    habits.map((h) => [h.name.trim().toLowerCase(), h.id]),
  )
  return { goalIdByTitle, habitIdByName }
}

/* Resolve portable refs; returns warnings for missing links */
function resolveGoalId(
  goalTitle: string | null | undefined,
  goalIdByTitle: Map<string, string>,
  rowLabel: string,
  warnings: string[],
): string | null {
  if (!goalTitle?.trim()) return null
  const id = goalIdByTitle.get(goalTitle.trim().toLowerCase())
  if (!id) warnings.push(`${rowLabel}: goal not found: "${goalTitle}"`)
  return id ?? null
}

function resolveHabitId(
  habitName: string | null | undefined,
  habitIdByName: Map<string, string>,
  rowLabel: string,
  warnings: string[],
): string | null {
  if (!habitName?.trim()) return null
  const id = habitIdByName.get(habitName.trim().toLowerCase())
  if (!id) warnings.push(`${rowLabel}: habit not found: "${habitName}"`)
  return id ?? null
}

/* Capture full canonical snapshot for one task (merge revert) */
export async function captureTaskCanonicalSnapshot(
  task: Task,
  externalId: string,
  parentExternalId: string | null,
): Promise<CanonicalTaskRecord> {
  const [checklists, deps, milestoneLinks] = await Promise.all([
    (async () => {
      const cls = await getTaskChecklists(task.id)
      const out: CanonicalTaskRecord['checklists'] = []
      for (const cl of cls) {
        const items = await getTaskChecklistItems(cl.id)
        out.push({
          title: cl.title,
          sort_order: cl.sort_order,
          items: items.map((it) => ({
            title: it.title,
            completed: it.completed,
            sort_order: it.sort_order,
          })),
        })
      }
      return out
    })(),
    getTaskDependencies(task.id),
    getMilestoneLinksForTaskIds([task.id]),
  ])

  const goals = await getGoals()
  const habits = await getHabits()
  const goalTitle = task.goal_id
    ? goals.find((g) => g.id === task.goal_id)?.name ?? null
    : null
  const habitName = task.habit_id
    ? habits.find((h) => h.id === task.habit_id)?.name ?? null
    : null

  const externalByTaskId = new Map<string, string>()
  externalByTaskId.set(task.id, externalId)

  const blocked_by = deps.blockedBy
    .map((d) => {
      const ext = externalByTaskId.get(d.blocker_id)
      return ext ? { blocker_external_id: ext } : null
    })
    .filter((x): x is { blocker_external_id: string } => x != null)

  const blocking = deps.blocking
    .map((d) => {
      const ext = externalByTaskId.get(d.blocked_id)
      return ext ? { blocked_external_id: ext } : null
    })
    .filter((x): x is { blocked_external_id: string } => x != null)

  return {
    id: task.id,
    external_id: externalId,
    parent_external_id: parentExternalId,
    title: task.title ?? '',
    description: task.description ?? null,
    start_date: task.start_date ?? null,
    due_date: task.due_date ?? null,
    priority: task.priority,
    status: task.status,
    category: task.category ?? null,
    time_estimate: task.time_estimate ?? null,
    recurrence_pattern: task.recurrence_pattern ?? null,
    completed_at: task.completed_at ?? null,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
    goal_title: goalTitle,
    habit_name: habitName,
    milestone_links: milestoneLinks.map((l) => ({
      goal_title: l.goal_title,
      milestone_title: l.milestone_title,
      sort_order: l.sort_order,
    })),
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    tags: (task.tags ?? []).map((tag) => ({ name: tag.name, color: tag.color })),
    checklists,
    dependencies: { blocked_by, blocking },
    extra: {},
  }
}

/* Clear checklists and dependencies before merge replace */
async function clearTaskChildren(taskId: string): Promise<void> {
  const [checklists, deps] = await Promise.all([
    getTaskChecklists(taskId),
    getTaskDependencies(taskId),
  ])
  for (const cl of checklists) {
    await deleteTaskChecklist(cl.id)
  }
  for (const d of [...deps.blockedBy, ...deps.blocking]) {
    await deleteTaskDependency(d.id)
  }
}

/* Apply tags, checklists, milestone links after task row exists */
async function applyTaskChildren(
  taskId: string,
  record: CanonicalTaskRecord,
  rowLabel: string,
  tagIdByName: Map<string, string>,
  createdTagIds: string[],
  summary: Pick<TaskImportResult, 'createdTags' | 'createdChecklists' | 'createdChecklistItems' | 'warnings'>,
): Promise<void> {
  const ensureTagIds = async (
    tags: Array<{ name: string; color?: TagColorId }>,
  ): Promise<string[]> => {
    const ids: string[] = []
    for (const tag of tags) {
      const name = (tag.name ?? '').trim()
      if (!name) continue
      const existingId = tagIdByName.get(name)
      if (existingId) {
        ids.push(existingId)
        continue
      }
      const created = await createTag(name, tag.color ?? DEFAULT_TAG_COLOR)
      tagIdByName.set(created.name, created.id)
      createdTagIds.push(created.id)
      summary.createdTags += 1
      ids.push(created.id)
    }
    return ids.slice(0, 3)
  }

  const tagIds = await ensureTagIds(record.tags ?? [])
  if (tagIds.length > 0) {
    await setTagsForTask(taskId, tagIds)
  }

  for (const cl of record.checklists ?? []) {
    const checklist = await createTaskChecklist({
      task_id: taskId,
      title: cl.title,
      sort_order: cl.sort_order ?? 0,
    })
    summary.createdChecklists += 1
    for (const item of cl.items ?? []) {
      const createdItem = await createChecklistItem({
        checklist_id: checklist.id,
        title: item.title,
        sort_order: item.sort_order ?? 0,
      })
      summary.createdChecklistItems += 1
      if (item.completed) {
        await toggleChecklistItemComplete(createdItem.id, true)
      }
    }
  }

  for (const link of record.milestone_links ?? []) {
    const milestoneId = await findMilestoneIdByTitles(
      link.goal_title,
      link.milestone_title,
    )
    if (!milestoneId) {
      summary.warnings.push(
        `${rowLabel}: milestone not found: "${link.goal_title}" / "${link.milestone_title}"`,
      )
      continue
    }
    try {
      await addTaskToMilestone(milestoneId, taskId, link.sort_order ?? 0)
    } catch {
      summary.warnings.push(
        `${rowLabel}: could not link milestone "${link.milestone_title}"`,
      )
    }
  }
}

/* Build core task create/update payload from canonical record */
function buildTaskFields(
  record: CanonicalTaskRecord,
  parentId: string | null | undefined,
  goalId: string | null,
  habitId: string | null,
) {
  return {
    title: record.title,
    description: record.description ?? null,
    start_date: record.start_date ?? null,
    due_date: record.due_date ?? null,
    priority: record.priority ?? 'medium',
    time_estimate: record.time_estimate ?? null,
    attachments: record.attachments ?? [],
    status: record.status ?? 'active',
    recurrence_pattern: record.recurrence_pattern ?? null,
    parent_id: parentId ?? null,
    goal_id: goalId,
    habit_id: habitId,
    category: record.category ?? null,
  }
}

/**
 * Import canonical task records into Supabase.
 */
export async function runTaskImport(
  records: CanonicalTaskRecord[],
  mode: ImportMode,
): Promise<TaskImportResult> {
  const result: TaskImportResult = {
    totalRows: records.length,
    createdTasks: 0,
    updatedTasks: 0,
    createdChecklists: 0,
    createdChecklistItems: 0,
    createdDependencies: 0,
    createdTags: 0,
    errors: [],
    warnings: [],
    revertPayload: null,
  }

  const createdTaskIds: string[] = []
  const createdTagIds: string[] = []
  const updatedTaskSnapshots: CanonicalTaskRecord[] = []

  const existingTags = await getTags()
  const tagIdByName = new Map<string, string>()
  for (const t of existingTags) tagIdByName.set(t.name, t.id)

  const { goalIdByTitle, habitIdByName } = await buildReferenceMaps()

  const existingTasks =
    mode === 'merge' ? await getTasks({ includeAllTasks: true }) : []
  const taskById = new Map(existingTasks.map((t) => [t.id, t]))

  const supabaseIdByExternal = new Map<string, string>()
  const pending = [...records]

  let guard = 0
  while (pending.length > 0 && guard < records.length + 5) {
    guard += 1
    let progressed = false

    for (let i = 0; i < pending.length; i++) {
      const r = pending[i]
      const rowLabel = `"${r.title}"`
      const parentExternal = r.parent_external_id
      const parentId = parentExternal ? supabaseIdByExternal.get(parentExternal) : null
      if (parentExternal && !parentId) continue

      const goalId = resolveGoalId(r.goal_title, goalIdByTitle, rowLabel, result.warnings)
      const habitId = resolveHabitId(r.habit_name, habitIdByName, rowLabel, result.warnings)

      try {
        const mergeId = mode === 'merge' && r.id?.trim() ? r.id.trim() : null
        const existing = mergeId ? taskById.get(mergeId) : undefined

        if (existing) {
          updatedTaskSnapshots.push(
            await captureTaskCanonicalSnapshot(
              existing,
              r.external_id,
              parentExternal,
            ),
          )
          await clearTaskChildren(existing.id)

          const fields = buildTaskFields(r, parentId, goalId, habitId)
          await updateTask(existing.id, {
            title: fields.title,
            description: fields.description,
            start_date: fields.start_date,
            due_date: fields.due_date,
            priority: fields.priority,
            time_estimate: fields.time_estimate,
            attachments: fields.attachments,
            status: fields.status,
            category: fields.category,
            goal_id: goalId,
            habit_id: habitId,
            recurrence_pattern: fields.recurrence_pattern,
            parent_id: fields.parent_id,
            completed_at:
              r.completed_at ??
              (fields.status === 'completed' ? new Date().toISOString() : null),
          })

          if (r.created_at || r.updated_at) {
            await setTaskImportTimestamps(existing.id, {
              created_at: r.created_at,
              updated_at: r.updated_at,
            })
          }

          supabaseIdByExternal.set(r.external_id, existing.id)
          result.updatedTasks += 1

          await applyTaskChildren(
            existing.id,
            r,
            rowLabel,
            tagIdByName,
            createdTagIds,
            result,
          )
        } else {
          const fields = buildTaskFields(r, parentId, goalId, habitId)
          const created = await createTask({
            title: fields.title,
            description: fields.description,
            start_date: fields.start_date,
            due_date: fields.due_date,
            priority: fields.priority,
            time_estimate: fields.time_estimate,
            attachments: fields.attachments,
            status: fields.status,
            recurrence_pattern: fields.recurrence_pattern,
            parent_id: fields.parent_id,
            goal_id: goalId,
            habit_id: habitId,
          })

          createdTaskIds.push(created.id)
          supabaseIdByExternal.set(r.external_id, created.id)
          result.createdTasks += 1

          if (fields.category?.trim()) {
            await updateTask(created.id, { category: fields.category })
          }

          const completedAt =
            r.completed_at ??
            (fields.status === 'completed' ? new Date().toISOString() : null)
          if (fields.status === 'completed' || r.completed_at) {
            await updateTask(created.id, {
              status: fields.status,
              completed_at: completedAt,
            })
          }

          if (r.created_at || r.updated_at) {
            await setTaskImportTimestamps(created.id, {
              created_at: r.created_at,
              updated_at: r.updated_at,
            })
          }

          await applyTaskChildren(
            created.id,
            r,
            rowLabel,
            tagIdByName,
            createdTagIds,
            result,
          )
        }

        pending.splice(i, 1)
        i -= 1
        progressed = true
      } catch (err) {
        result.errors.push(
          err instanceof Error
            ? `Failed to import ${rowLabel}: ${err.message}`
            : `Failed to import ${rowLabel}.`,
        )
        pending.splice(i, 1)
        i -= 1
      }
    }

    if (!progressed) break
  }

  if (pending.length > 0) {
    for (const r of pending) {
      result.errors.push(
        `Skipped "${r.title}" because its parent external_id "${r.parent_external_id ?? ''}" was not imported.`,
      )
    }
  }

  const seenEdges = new Set<string>()
  for (const r of records) {
    const blockedId = supabaseIdByExternal.get(r.external_id)
    if (!blockedId) continue

    const addEdge = async (blockerExternal: string, blockedExternal: string) => {
      const blockerId = supabaseIdByExternal.get(blockerExternal)
      const blockedIdResolved = supabaseIdByExternal.get(blockedExternal)
      if (!blockerId || !blockedIdResolved) return
      const key = `${blockerId}|${blockedIdResolved}`
      if (seenEdges.has(key)) return
      seenEdges.add(key)
      try {
        await createTaskDependency({
          blocker_id: blockerId,
          blocked_id: blockedIdResolved,
        })
        result.createdDependencies += 1
      } catch (err) {
        result.errors.push(
          err instanceof Error
            ? `Dependency error for "${r.title}": ${err.message}`
            : `Dependency error for "${r.title}".`,
        )
      }
    }

    for (const b of r.dependencies?.blocked_by ?? []) {
      await addEdge(b.blocker_external_id, r.external_id)
    }
    for (const b of r.dependencies?.blocking ?? []) {
      await addEdge(r.external_id, b.blocked_external_id)
    }
  }

  if (createdTaskIds.length > 0 || updatedTaskSnapshots.length > 0) {
    result.revertPayload = {
      kind: 'tasks',
      createdTaskIds,
      createdTagIds,
      updatedTaskSnapshots,
    }
  }

  return result
}

/**
 * Revert a tasks import batch.
 */
export async function revertTasksImport(payload: TasksRevertPayload): Promise<void> {
  for (const snapshot of payload.updatedTaskSnapshots) {
    if (!snapshot.id) continue
    await clearTaskChildren(snapshot.id)
    const { goalIdByTitle, habitIdByName } = await buildReferenceMaps()
    const goalId = snapshot.goal_title
      ? goalIdByTitle.get(snapshot.goal_title.trim().toLowerCase()) ?? null
      : null
    const habitId = snapshot.habit_name
      ? habitIdByName.get(snapshot.habit_name.trim().toLowerCase()) ?? null
      : null

    await updateTask(snapshot.id, {
      title: snapshot.title,
      description: snapshot.description,
      start_date: snapshot.start_date,
      due_date: snapshot.due_date,
      priority: snapshot.priority,
      time_estimate: snapshot.time_estimate,
      attachments: snapshot.attachments,
      status: snapshot.status,
      category: snapshot.category,
      goal_id: goalId,
      habit_id: habitId,
      recurrence_pattern: snapshot.recurrence_pattern,
      parent_id: null,
      completed_at: snapshot.completed_at,
    })

    if (snapshot.created_at || snapshot.updated_at) {
      await setTaskImportTimestamps(snapshot.id, {
        created_at: snapshot.created_at,
        updated_at: snapshot.updated_at,
      })
    }

    const tagIdByName = new Map((await getTags()).map((t) => [t.name, t.id]))
    const noop = {
      createdTags: 0,
      createdChecklists: 0,
      createdChecklistItems: 0,
      warnings: [] as string[],
    }
    await applyTaskChildren(
      snapshot.id,
      snapshot,
      `revert ${snapshot.title}`,
      tagIdByName,
      [],
      noop,
    )
  }

  for (const taskId of payload.createdTaskIds) {
    await deleteTask(taskId)
  }

  for (const tagId of payload.createdTagIds) {
    try {
      await deleteTagFromAllTasks(tagId)
    } catch {
      /* Tag may be in use elsewhere */
    }
  }
}
