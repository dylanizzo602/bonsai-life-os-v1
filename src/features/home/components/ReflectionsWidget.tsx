/* ReflectionsWidget: Random "X years ago today" entry with Read entry link */

import { useState, useEffect } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { getRandomReflectionEntryYearsAgoToday } from '../../../lib/supabase/reflections'
import type { MorningBriefingResponses, ReflectionEntry } from '../../reflections/types'

export interface ReflectionsWidgetProps {
  onReadEntry: () => void
}

/* Plain-text extraction: best-effort conversion from HTML-ish content to readable text */
function toPlainText(value: string): string {
  /* Strip tags: keep it simple for widget previews */
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/* Sentence trimming: return the first 2 sentences, with ellipsis if truncated */
function previewSentences(text: string, maxSentences: number = 2): string {
  const cleaned = text.trim()
  if (!cleaned) return ''

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= maxSentences) return cleaned

  const head = sentences.slice(0, maxSentences).join(' ').trim()
  return head ? `${head}…` : `${cleaned.slice(0, 160).trim()}…`
}

/** Widget snippet: show memorable moment preview (few sentences + ellipsis) */
function getMemorableMomentPreview(entry: ReflectionEntry): string {
  /* Responses: only use the memorableMoment field for this widget */
  const responses = entry.responses
  if (responses == null || typeof responses !== 'object' || Array.isArray(responses)) return 'No memorable moment found.'
  const r = responses as MorningBriefingResponses
  const raw = typeof r.memorableMoment === 'string' ? r.memorableMoment : ''
  const plain = raw ? toPlainText(raw) : ''
  const preview = plain ? previewSentences(plain, 2) : ''
  return preview || 'No memorable moment found.'
}

/**
 * Reflections widget: Random "X years ago today..." with snippet and Read entry.
 */
export function ReflectionsWidget({ onReadEntry }: ReflectionsWidgetProps) {
  const [entry, setEntry] = useState<ReflectionEntry | null>(null)
  const [yearsAgo, setYearsAgo] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getRandomReflectionEntryYearsAgoToday()
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
  }, [])

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
          <p className="text-body text-bonsai-slate-700 mb-3">{getMemorableMomentPreview(entry)}</p>
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
