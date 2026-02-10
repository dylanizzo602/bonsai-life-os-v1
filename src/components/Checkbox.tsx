/* Checkbox component: Reusable checkbox with label and consistent styling */
import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Checkbox label text */
  label?: string
}

/**
 * Reusable checkbox component with label support
 * Includes consistent styling and focus states
 */
export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        className={`w-4 h-4 text-bonsai-sage-600 border-bonsai-slate-300 rounded focus:ring-2 focus:ring-bonsai-sage-500 ${className}`}
        {...props}
      />
      {label && <span className="ml-2 text-sm text-bonsai-slate-700">{label}</span>}
    </label>
  )
}
