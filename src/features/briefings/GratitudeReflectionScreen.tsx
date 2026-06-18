/* GratitudeReflectionScreen: Centered gratitude prompt */

import { BriefingShell, BriefingScreenHeading } from './components/BriefingShell'
import { BriefingTextarea } from './components/BriefingTextarea'

interface GratitudeReflectionScreenProps {
  value: string
  onChange: (value: string) => void
  onBack?: () => void
  onClose?: () => void
}

/**
 * Gratitude reflection step with centered hero and minimal textarea.
 */
export function GratitudeReflectionScreen({
  value,
  onChange,
  onBack,
  onClose,
}: GratitudeReflectionScreenProps) {
  return (
    <BriefingShell>
      <div className="mx-auto max-w-2xl text-center">
        <BriefingScreenHeading
          title="What are you grateful for today?"
          description="Gratitude grounds your attention in what already supports you."
          onBack={onBack}
          onClose={onClose}
          centered
        />
        {/* Hero */}
        <div className="relative mb-10 h-64 w-full overflow-hidden rounded-xl">
          <img
            src="/images/gratitude-hero.jpg"
            alt=""
            className="h-full w-full object-cover brightness-95"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
        </div>

        <div className="mx-auto max-w-lg px-4">
          <p className="text-secondary mb-4 text-xs font-bold uppercase tracking-widest text-outline">
            Intentional Reflection
          </p>
          <BriefingTextarea
            id="gratitude"
            value={value}
            onChange={onChange}
            variant="centered"
            placeholder="I am grateful for…"
            rows={4}
          />
        </div>
      </div>
    </BriefingShell>
  )
}
