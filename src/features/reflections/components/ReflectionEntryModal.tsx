/* ReflectionEntryModal: Read-only reflection entry in a modal overlay */

import { Modal } from '../../../components/Modal'
import { ReflectionEntryView } from '../ReflectionEntryView'
import type { JournalResponses, MorningBriefingResponses, ReflectionEntry } from '../types'
import { formatEntryDate, getEntryDisplayTitle } from '../utils/entryDisplay'

/* Escape HTML for plain-text reflections so we can safely render older entries alongside rich text ones */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/* Convert a reflection answer into display HTML, treating TipTap-style HTML as-is and older plain text with escaped characters and <br /> for newlines */
function reflectionValueToHtml(value: string): string {
  if (!value?.trim()) return ''
  const looksLikeHtml = /<\s*(p|ul|ol|li|strong|em|h1|h2|br|div)[\s>]/i.test(value)
  if (looksLikeHtml) return value
  return escapeHtml(value).replace(/\n/g, '<br />')
}

interface ReflectionEntryModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Entry to display (null when closed) */
  entry: ReflectionEntry | null
  /** True while fetching the full entry from the database */
  loading?: boolean
  /** Close the modal */
  onClose: () => void
}

/**
 * Modal overlay for reading a reflection entry without leaving the current page.
 * Supports morning briefing Q&A and journal body content.
 */
export function ReflectionEntryModal({
  isOpen,
  entry,
  loading = false,
  onClose,
}: ReflectionEntryModalProps) {
  /* Modal title: entry title with sensible fallback by type */
  const modalTitle = entry ? getEntryDisplayTitle(entry) : 'Reflection entry'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} fullScreenOnMobile>
      {loading ? (
        <p className="text-body text-bonsai-slate-500">Loading…</p>
      ) : entry ? (
        <>
          <p className="text-secondary mb-6 text-bonsai-slate-500">
            {formatEntryDate(entry.created_at)}
          </p>

          {/* Journal: freeform body */}
          {entry.type === 'journal' ? (
            <JournalEntryBody entry={entry} />
          ) : (
            /* Morning briefing and other Q&A-style entries */
            <ReflectionEntryView
              title={null}
              responses={entry.responses as MorningBriefingResponses | Record<string, unknown>}
              hideBackButton
            />
          )}
        </>
      ) : (
        <p className="text-body text-bonsai-slate-500">Entry not found.</p>
      )}
    </Modal>
  )
}

/** Read-only journal body for modal display */
function JournalEntryBody({ entry }: { entry: ReflectionEntry }) {
  const body = (entry.responses as JournalResponses).body ?? ''

  return body ? (
    <div
      className="text-body text-bonsai-slate-800"
      dangerouslySetInnerHTML={{ __html: reflectionValueToHtml(body) }}
    />
  ) : (
    <p className="text-body text-bonsai-slate-800">No content.</p>
  )
}
