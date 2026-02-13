/* Select component: Reusable dropdown select with responsive styling */
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Select label (optional) */
  label?: string
  /** Error message to display */
  error?: string
  /** Options array with value and label */
  options: Array<{ value: string; label: string }>
  /**
   * Optional fixed size; when omitted, select uses responsive padding/text by breakpoint.
   * Responsive default: mobile (< 768px) → tablet (md) → desktop (lg).
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable select dropdown with label and error support.
 * Responsive by default (Tailwind breakpoints); optional size override when fixed size is needed.
 */
export function Select({ label, error, options, size, className = '', ...props }: SelectProps) {
  /* Base select styles: full width, border, focus ring, bg */
  const baseSelectClasses =
    'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent bg-white'
  /* Responsive padding/text when size is omitted; body typography per branding */
  const responsiveSizeClasses =
    'px-3 py-2 md:px-4 md:py-2.5 lg:px-4 lg:py-3 text-body'
  const fixedSizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-4 py-3 text-base',
  }
  const sizeClasses = size ? fixedSizeClasses[size] : responsiveSizeClasses
  const selectClasses = `${baseSelectClasses} ${sizeClasses} ${
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
      <select className={selectClasses} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-secondary text-red-600">{error}</p>}
    </div>
  )
}
