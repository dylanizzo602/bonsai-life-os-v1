/* Checkbox component: Reusable checkbox with label and responsive styling */
import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Checkbox label text */
  label?: string
  /**
   * Optional fixed size; when omitted, checkbox uses responsive sizing by breakpoint.
   * Responsive default: mobile (< 768px) → tablet (md) → desktop (lg).
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable checkbox with label support.
 * Responsive by default (Tailwind breakpoints); optional size override when fixed size is needed.
 */
export function Checkbox({ label, size, className = '', ...props }: CheckboxProps) {
  /* Responsive box size when size omitted; fixed when size provided */
  const responsiveBoxClasses = 'w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5'
  const fixedBoxClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-5 h-5' }
  const boxClasses = `${size ? fixedBoxClasses[size] : responsiveBoxClasses} text-bonsai-sage-600 border-bonsai-slate-300 rounded focus:ring-2 focus:ring-bonsai-sage-500 ${className}`

  /* Responsive label text when size omitted; fixed when size provided */
  const responsiveLabelClasses = 'ml-2 text-sm text-bonsai-slate-700 md:text-base'
  const fixedLabelClasses = {
    sm: 'ml-2 text-sm text-bonsai-slate-700',
    md: 'ml-2 text-base text-bonsai-slate-700',
    lg: 'ml-2 text-base text-bonsai-slate-700',
  }
  const labelClasses = size ? fixedLabelClasses[size] : responsiveLabelClasses

  return (
    <label className="flex items-center cursor-pointer">
      <input type="checkbox" className={boxClasses} {...props} />
      {label && <span className={labelClasses}>{label}</span>}
    </label>
  )
}
