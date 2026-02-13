/* Input component: Reusable form input with responsive styling */
import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
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
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, size, className = '', ...props }, ref) => {
  /* Base input styles: full width, border, focus ring */
  const baseInputClasses =
    'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent'
  /* Responsive padding/text when size is omitted; body typography per branding */
  const responsiveSizeClasses =
    'px-3 py-2 md:px-4 md:py-2.5 lg:px-4 lg:py-3 text-body'
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

  /* Label: secondary typography when size omitted; fixed when size provided */
  const responsiveLabelClasses = 'block text-secondary font-medium text-bonsai-slate-700 mb-1'
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
      <input ref={ref} className={inputClasses} {...props} />
      {error && <p className="mt-1 text-secondary text-red-600">{error}</p>}
    </div>
  )
  },
)

Input.displayName = 'Input'
