/* ReflectionsWidget: One year ago today entry with Read entry link */

import { useState, useEffect } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { getReflectionEntryOneYearAgo } from '../../../lib/supabase/reflections'
import type { ReflectionEntry } from '../../reflections/types'

export interface ReflectionsWidgetProps {
  onReadEntry: () => void
}

/** Short snippet from reflection entry (title or first response value) */
function getSnippet(entry: ReflectionEntry): string {
  if (entry.title?.trim()) return entry.title
  const r = entry.responses as Record<string, unknown>
  const first = Object.values(r).find((v) => typeof v === 'string' && (v as string).trim())
  return typeof first === 'string' ? first.slice(0, 120) : 'No content'
}

/**
 * Reflections widget: "One year ago today..." with snippet and Read entry.
 */
export function ReflectionsWidget({ onReadEntry }: ReflectionsWidgetProps) {
  const [entry, setEntry] = useState<ReflectionEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getReflectionEntryOneYearAgo()
      .then((e) => {
        if (!cancelled) setEntry(e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DashboardWidget title="One year ago today...">
      {loading ? (
        <p className="text-secondary text-bonsai-slate-500">Loading…</p>
      ) : entry == null ? (
        <p className="text-secondary text-bonsai-slate-500 mb-2">
          No entry from one year ago today.
        </p>
      ) : (
        <>
          <p className="text-body text-bonsai-slate-700 mb-3">{getSnippet(entry)}</p>
          <button
            type="button"
            onClick={onReadEntry}
            className="text-body font-medium text-bonsai-sage-700 hover:underline"
          >
            Read entry
          </button>
        </>
      )}
    </DashboardWidget>
  )
}
