/* Textarea component: Reusable multi-line input with Bonsai styling */
import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Optional label */
  label?: string
  /** Error message to display */
  error?: string
}

/**
 * Reusable textarea with same border/focus styling as Input.
 * Uses text-body for consistent typography.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    /* Base styles: full width, border, focus ring, body typography */
    const baseClasses =
      'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent px-3 py-2 md:px-4 md:py-2.5 lg:px-4 lg:py-3 text-body min-h-[120px]'
    const borderClasses = error ? 'border-red-500' : 'border-bonsai-slate-300'
    const labelClasses = 'block text-secondary font-medium text-bonsai-slate-700 mb-1'

    return (
      <div className="w-full">
        {label && <label className={labelClasses}>{label}</label>}
        <textarea
          ref={ref}
          className={`${baseClasses} ${borderClasses} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-secondary text-red-600">{error}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
