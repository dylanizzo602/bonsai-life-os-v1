/* JournalEntryEditor: Document-style journal editor for reflection entries */

import { useCallback, useMemo, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import {
  RichTextEditor,
  type RichTextEditorSaveStatus,
} from '../../notes/RichTextEditor'
import type { ReflectionEntry, JournalResponses } from '../types'
import {
  dateInputValueToIso,
  formatLastEditedLabel,
  formatLongEntryDate,
  isoToDateInputValue,
} from '../utils/formatRelativeTime'

interface JournalEntryEditorProps {
  entry: ReflectionEntry
  onBack: () => void
  onUpdate: (
    id: string,
    input: { title?: string; responses?: JournalResponses; created_at?: string },
  ) => Promise<unknown>
  /** Delete the current entry and return to the list */
  onDelete: () => Promise<void>
}

/**
 * Document-style journal editor: back nav, date metadata, title, toolbar, and paper page body.
 */
export function JournalEntryEditor({ entry, onBack, onUpdate, onDelete }: JournalEntryEditorProps) {
  const journalBody = (entry.responses as JournalResponses).body ?? ''

  /* Local title state; remount via key={entry.id} on parent when switching entries */
  const [title, setTitle] = useState(entry.title ?? 'Untitled')
  const [saveStatus, setSaveStatus] = useState<RichTextEditorSaveStatus>('saved')
  const [lastEditedMs, setLastEditedMs] = useState(() => new Date(entry.created_at).getTime())
  const [displayDateIso, setDisplayDateIso] = useState(entry.created_at)
  const [deleting, setDeleting] = useState(false)

  const dateInputValue = useMemo(() => isoToDateInputValue(displayDateIso), [displayDateIso])
  const dateDisplayLabel = useMemo(() => formatLongEntryDate(displayDateIso), [displayDateIso])
  const lastEditedLabel = useMemo(() => formatLastEditedLabel(lastEditedMs), [lastEditedMs])

  /* Persist helper: show saving indicator then update last-edited timestamp */
  const persist = useCallback(
    async (input: { title?: string; responses?: JournalResponses; created_at?: string }) => {
      setSaveStatus('saving')
      try {
        const updated = (await onUpdate(entry.id, input)) as ReflectionEntry | undefined
        setSaveStatus('saved')
        setLastEditedMs(Date.now())
        if (updated?.created_at) setDisplayDateIso(updated.created_at)
      } catch {
        setSaveStatus('idle')
      }
    },
    [entry.id, onUpdate],
  )

  /* Save title on blur when changed */
  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim() || 'Untitled'
    if (trimmed === (entry.title ?? 'Untitled')) return
    void persist({ title: trimmed })
  }, [entry.title, title, persist])

  /* Save body on editor blur */
  const handleBodyBlur = useCallback(
    (html: string) => {
      if (html === journalBody) return
      void persist({ responses: { body: html } })
    },
    [journalBody, persist],
  )

  /* Save entry date when user picks a new calendar day */
  const handleDateChange = useCallback(
    (ymd: string) => {
      if (!ymd || ymd === dateInputValue) return
      const iso = dateInputValueToIso(ymd)
      setDisplayDateIso(iso)
      void persist({ created_at: iso })
    },
    [dateInputValue, persist],
  )

  /* Delete entry (confirmation handled by parent) */
  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }, [onDelete])

  return (
    <div className="min-h-full overflow-y-auto bg-surface-container-low/20">
      <div className="mx-auto flex w-full max-w-[850px] flex-col px-4 pb-24 md:px-8">
        {/* Back navigation */}
        <div className="mt-6 md:mt-8">
          <button
            type="button"
            onClick={onBack}
            className="group -ml-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-primary transition-colors hover:bg-primary-fixed/30"
          >
            <MaterialIcon name="arrow_back" className="text-lg" />
            <span className="text-sm font-semibold">Back to Reflections</span>
          </button>
        </div>

        {/* Document header: date metadata and title */}
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {/* Date, last-edited metadata, and delete action */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-outline">
              <div className="flex flex-wrap items-center gap-4">
                <label className="relative flex cursor-pointer items-center gap-1 transition-colors hover:text-primary">
                  <MaterialIcon name="calendar_today" className="text-base" />
                  <input
                    type="date"
                    value={dateInputValue}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Entry date"
                  />
                  <span>{dateDisplayLabel}</span>
                  <MaterialIcon name="expand_more" className="text-xs" />
                </label>
                <span className="text-outline-variant" aria-hidden>
                  •
                </span>
                <div className="flex items-center gap-1">
                  <MaterialIcon name="history" className="text-base" />
                  <span>{lastEditedLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-error transition-colors hover:bg-error-container/40 disabled:opacity-50"
                aria-label="Delete reflection"
              >
                <MaterialIcon name="delete" className="text-base" />
                <span className="text-secondary font-semibold">{deleting ? 'Deleting…' : 'Delete'}</span>
              </button>
            </div>

            {/* Editable document title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full border-0 bg-transparent text-page-title font-semibold tracking-tight text-on-surface focus:outline-none focus:ring-0"
              aria-label="Journal entry title"
              placeholder="Untitled"
            />
          </div>

          {/* Toolbar + paper page editor */}
          <RichTextEditor
            editorKey={entry.id}
            value={journalBody}
            onBlur={handleBodyBlur}
            placeholder="Write your reflection…"
            variant="reflection"
            saveStatus={saveStatus}
          />
        </div>
      </div>
    </div>
  )
}
