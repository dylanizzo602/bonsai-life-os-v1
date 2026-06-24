/* ReflectionsWidget: Random "X years ago today" entry with Read entry link */

import { useState, useEffect } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { getRandomReflectionEntryYearsAgoToday } from '../../../lib/supabase/reflections'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { ReflectionEntry } from '../../reflections/types'
import { getEntryExcerpt } from '../../reflections/utils/entryDisplay'

export interface ReflectionsWidgetProps {
  onReadEntry: () => void
}

/**
 * Reflections widget: Random "X years ago today..." with snippet and Read entry.
 */
export function ReflectionsWidget({ onReadEntry }: ReflectionsWidgetProps) {
  const timeZone = useUserTimeZone()
  const [entry, setEntry] = useState<ReflectionEntry | null>(null)
  const [yearsAgo, setYearsAgo] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getRandomReflectionEntryYearsAgoToday({ timeZone })
      .then((result) => {
        if (cancelled) return
        setEntry(result?.entry ?? null)
        setYearsAgo(result?.yearsAgo ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [timeZone])

  return (
    <DashboardWidget title={yearsAgo ? `${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago today...` : 'Years ago today...'}>
      {loading ? (
        <p className="text-secondary text-bonsai-slate-500">Loading…</p>
      ) : entry == null ? (
        <p className="text-secondary text-bonsai-slate-500 mb-2">
          No entry from years ago today.
        </p>
      ) : (
        <>
          <p className="text-body text-bonsai-slate-700 mb-3">
            {getEntryExcerpt(entry) || 'No excerpt available.'}
          </p>
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
