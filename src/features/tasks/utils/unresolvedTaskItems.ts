/* unresolvedTaskItems: Shared counts for open subtasks and checklist items on a task */

export interface UnresolvedTaskItemCounts {
  unresolvedSubtaskCount: number
  unresolvedChecklistItemCount: number
}

/** Derive unresolved counts from task row enrichment (list and Bonsai views). */
export function getUnresolvedCountsFromEnrichment(enrichment: {
  checklistSummary?: { completed: number; total: number }
  incompleteSubtaskCount: number
}): UnresolvedTaskItemCounts {
  const unresolvedChecklistItemCount = Math.max(
    0,
    (enrichment.checklistSummary?.total ?? 0) - (enrichment.checklistSummary?.completed ?? 0),
  )
  return {
    unresolvedSubtaskCount: enrichment.incompleteSubtaskCount,
    unresolvedChecklistItemCount,
  }
}

/** True when the task still has open subtasks or checklist items. */
export function hasUnresolvedTaskItems(counts: UnresolvedTaskItemCounts): boolean {
  return counts.unresolvedSubtaskCount + counts.unresolvedChecklistItemCount > 0
}
