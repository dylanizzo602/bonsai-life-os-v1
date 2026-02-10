/* Input component: Reusable form input with consistent styling */
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label (optional) */
  label?: string
  /** Error message to display */
  error?: string
}

/**
 * Reusable input component with label and error message support
 * Includes consistent styling and focus states
 */
export function Input({ label, error, className = '', ...props }: InputProps) {
  const inputClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent ${
    error ? 'border-red-500' : 'border-bonsai-slate-300'
  } ${className}`

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
