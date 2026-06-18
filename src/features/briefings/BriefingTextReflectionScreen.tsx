/* BriefingTextReflectionScreen: Shared shell for Sunday weekly reflection prompts */

import { MaterialIcon } from '../../components/MaterialIcon'
import { BriefingShell } from './components/BriefingShell'
import { BriefingTextarea } from './components/BriefingTextarea'

interface BriefingTextReflectionScreenProps {
  eyebrow?: string
  title: string
  description?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onBack?: () => void
  onClose?: () => void
}

/**
 * Reusable text reflection screen (Sunday week highlights / improve steps).
 */
export function BriefingTextReflectionScreen({
  eyebrow = 'Weekly Reflection',
  title,
  description,
  label,
  value,
  onChange,
  placeholder,
  onBack,
  onClose,
}: BriefingTextReflectionScreenProps) {
  return (
    <BriefingShell>
      <div className="mx-auto max-w-2xl">
        <div className="relative mb-10 text-center">
          {onBack != null ? (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Go back"
            >
              <MaterialIcon name="arrow_back" className="text-on-surface-variant" />
            </button>
          ) : null}
          {onClose != null ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
              aria-label="Close briefing"
            >
              <MaterialIcon name="close" className="text-on-surface-variant" />
            </button>
          ) : null}
          <p className="text-secondary mb-2 text-xs font-bold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
          <h1 className="text-page-title mb-3 font-semibold text-on-surface">{title}</h1>
          {description ? (
            <p className="text-body text-on-surface-variant">{description}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6 md:p-8">
          <label htmlFor="briefing-text-reflection" className="text-secondary mb-3 block font-medium">
            {label}
          </label>
          <BriefingTextarea
            id="briefing-text-reflection"
            value={value}
            onChange={onChange}
            placeholder={placeholder ?? 'Write your thoughts…'}
            rows={5}
          />
        </div>
      </div>
    </BriefingShell>
  )
}
