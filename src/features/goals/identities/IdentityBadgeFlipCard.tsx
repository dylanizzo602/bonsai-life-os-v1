/* IdentityBadgeFlipCard: flip-on-click badge card with optional badge image upload */

import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'

export interface IdentityBadgeFlipCardProps {
  /** Identity name used for fallback label */
  name: string
  /** Public badge URL to display on the card front */
  badgeUrl: string | null
  /** Text shown on the flipped/back side */
  description: string
  /** Whether clicking the badge flips it to reveal the description */
  flippable: boolean
  /** Whether the badge is allowed to have a custom upload */
  canUploadBadge: boolean
  /** Upload handler (provided by hook) */
  onUploadBadge: (file: File) => Promise<void>
}

function badgeFallbackLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

/**
 * Flip card (CSS 3D):
 * - Click badge front to flip and reveal description
 * - Optional upload control for customizing the badge image
 */
export function IdentityBadgeFlipCard({
  name,
  badgeUrl,
  description,
  flippable,
  canUploadBadge,
  onUploadBadge,
}: IdentityBadgeFlipCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fallbackInitial = useMemo(() => badgeFallbackLabel(name), [name])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUploadBadge(file)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
        style={{ perspective: '800px' }}
      >
        <button
          type="button"
          disabled={!flippable}
          className="block w-full h-full rounded-full focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 disabled:opacity-100 disabled:cursor-default"
          onClick={() => {
            if (!flippable) return
            setFlipped((v) => !v)
          }}
          aria-label={flippable ? (flipped ? 'Hide identity description' : 'Show identity description') : undefined}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flippable && flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-full border border-bonsai-slate-200 bg-white flex items-center justify-center overflow-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {badgeUrl ? (
                <img
                  src={badgeUrl}
                  alt="Identity badge"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bonsai-slate-50 text-bonsai-slate-600 text-body font-semibold">
                  {fallbackInitial}
                </div>
              )}
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-full border border-bonsai-slate-200 bg-white flex items-center justify-center p-2"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
            >
              <p className="text-secondary text-bonsai-slate-700 text-center text-[12px] md:text-[13px] lg:text-[14px]">
                {description}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Upload control (stays outside click-flip area) */}
      {canUploadBadge && (
        <div className="w-full flex justify-center">
          <label className="inline-flex items-center gap-2 rounded-full bg-bonsai-slate-50 border border-bonsai-slate-200 px-3 py-1 text-secondary font-medium text-bonsai-slate-700 hover:bg-bonsai-slate-100 cursor-pointer transition-colors">
            <span>{uploading ? 'Uploading...' : 'Upload'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </div>
  )
}

