/* Select component: Reusable dropdown select with consistent styling */
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Select label (optional) */
  label?: string
  /** Error message to display */
  error?: string
  /** Options array with value and label */
  options: Array<{ value: string; label: string }>
}

/**
 * Reusable select dropdown component with label and error message support
 * Includes consistent styling and focus states
 */
export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  const selectClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
    error ? 'border-red-500' : 'border-gray-300'
  } ${className}`

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
