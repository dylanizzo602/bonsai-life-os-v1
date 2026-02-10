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
        className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
      {label && <span className="ml-2 text-sm text-gray-700">{label}</span>}
    </label>
  )
}
