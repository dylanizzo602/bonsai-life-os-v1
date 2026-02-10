/* Input component: Reusable form input with responsive styling */
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label (optional) */
  label?: string
  /** Error message to display */
  error?: string
  /**
   * Optional fixed size; when omitted, input uses responsive padding/text by breakpoint.
   * Responsive default: mobile (< 768px) → tablet (md) → desktop (lg).
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable input component with label and error support.
 * Responsive by default (Tailwind breakpoints); optional size override when fixed size is needed.
 */
export function Input({ label, error, size, className = '', ...props }: InputProps) {
  /* Base input styles: full width, border, focus ring */
  const baseInputClasses =
    'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent'
  /* Responsive padding/text when size is omitted */
  const responsiveSizeClasses =
    'px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base lg:px-4 lg:py-3 lg:text-base'
  /* Fixed size overrides when size prop is provided */
  const fixedSizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-4 py-3 text-base',
  }
  const sizeClasses = size ? fixedSizeClasses[size] : responsiveSizeClasses
  const inputClasses = `${baseInputClasses} ${sizeClasses} ${
    error ? 'border-red-500' : 'border-bonsai-slate-300'
  } ${className}`

  /* Label: responsive text size when size omitted; fixed when size provided */
  const responsiveLabelClasses = 'block text-sm font-medium text-bonsai-slate-700 mb-1 md:text-base'
  const fixedLabelClasses = {
    sm: 'block text-sm font-medium text-bonsai-slate-700 mb-1',
    md: 'block text-base font-medium text-bonsai-slate-700 mb-1',
    lg: 'block text-base font-medium text-bonsai-slate-700 mb-1',
  }
  const labelClasses = size ? fixedLabelClasses[size] : responsiveLabelClasses

  return (
    <div className="w-full">
      {label && (
        <label className={labelClasses}>
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
