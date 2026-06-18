/* MemorableMomentReflectionScreen: Yesterday reflection with years-ago card */

import { MaterialIcon } from '../../components/MaterialIcon'
import { DEFAULT_MORNING_BRIEFING_QUOTE } from './constants/morningBriefingQuotes'
import { BriefingShell, BriefingScreenHeading } from './components/BriefingShell'
import { BriefingTextarea } from './components/BriefingTextarea'
import type { ReflectionEntry } from '../reflections/types'
import type { MorningBriefingResponses } from '../reflections/types'

interface MemorableMomentReflectionScreenProps {
  value: string
  onChange: (value: string) => void
  yearsAgoEntry: { entry: ReflectionEntry; yearsAgo: number } | null
  yearsAgoLoading?: boolean
  onReadYearsAgoEntry?: (entry: ReflectionEntry) => void
  onBack?: () => void
  onClose?: () => void
}

/** Extract display excerpt from a past reflection entry */
function getYearsAgoExcerpt(entry: ReflectionEntry): string {
  const responses = entry.responses as MorningBriefingResponses
  const text =
    responses.memorableMoment?.trim() ||
    responses.gratefulFor?.trim() ||
    responses.weekHighlights?.trim() ||
    ''
  if (!text) return 'No excerpt available.'
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

/** Title for the years-ago card (matches home Reflections widget wording) */
function getYearsAgoTodayTitle(
  yearsAgoEntry: { yearsAgo: number } | null,
  loading: boolean,
): string {
  if (loading) return 'Years ago today…'
  if (!yearsAgoEntry) return 'Years ago today…'
  const { yearsAgo } = yearsAgoEntry
  return `${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago today…`
}

/**
 * Memorable moment reflection with "years ago today" card from past entries.
 */
export function MemorableMomentReflectionScreen({
  value,
  onChange,
  yearsAgoEntry,
  yearsAgoLoading = false,
  onReadYearsAgoEntry,
  onBack,
  onClose,
}: MemorableMomentReflectionScreenProps) {
  return (
    <BriefingShell>
      <div className="mx-auto max-w-2xl">
        <BriefingScreenHeading
          title="Yesterday's Reflection"
          onBack={onBack}
          onClose={onClose}
          centered
          className="mb-6"
        />
        {/* Hero */}
        <div className="relative mb-10 h-64 w-full overflow-hidden rounded-xl">
          <img
            src="/images/reflection-hero.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        </div>

        <div className="mb-10 text-center">
          <p className="text-body mx-auto max-w-lg italic text-on-surface-variant">
            &ldquo;{DEFAULT_MORNING_BRIEFING_QUOTE}&rdquo;
          </p>
        </div>

        <div className="mb-10 rounded-xl border border-outline-variant/20 bg-surface-container-low p-6 md:p-8">
          <label htmlFor="memorable-moment" className="text-body mb-2 block font-medium text-on-surface">
            What was one memorable moment from yesterday?
          </label>
          <BriefingTextarea
            id="memorable-moment"
            value={value}
            onChange={onChange}
            variant="minimal"
            placeholder="A moment that stood out…"
            rows={4}
          />
          <p className="text-secondary mt-3 text-on-surface-variant">
            Focus on the feeling, not the output.
          </p>
        </div>

        {/* Years ago today card — always visible below the reflection prompt */}
        <div className="mb-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="text-body mb-4 font-semibold text-on-surface">
            {getYearsAgoTodayTitle(yearsAgoEntry, yearsAgoLoading)}
          </h2>
          {yearsAgoLoading ? (
            <p className="text-secondary text-on-surface-variant">Loading…</p>
          ) : yearsAgoEntry ? (
            <>
              <p className="text-secondary mb-3 text-on-surface-variant">
                {new Date(yearsAgoEntry.entry.created_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-body mb-4 text-on-surface">
                {getYearsAgoExcerpt(yearsAgoEntry.entry)}
              </p>
              {onReadYearsAgoEntry ? (
                <button
                  type="button"
                  onClick={() => onReadYearsAgoEntry(yearsAgoEntry.entry)}
                  className="text-secondary inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Read full entry
                  <MaterialIcon name="arrow_forward" className="text-sm" />
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-secondary text-on-surface-variant">
              No entry from years ago today.
            </p>
          )}
        </div>
      </div>
    </BriefingShell>
  )
}
