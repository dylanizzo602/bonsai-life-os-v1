/* SettingsUnderlineField: Zenith-style label + bottom-border input or select */

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const fieldClassName =
  'zenith-input w-full border-0 border-b border-outline-variant bg-transparent px-0 pb-2 text-body text-on-surface outline-none transition-all focus:border-primary focus:ring-0 disabled:opacity-60'

interface SettingsUnderlineFieldProps {
  label: string
  children?: ReactNode
}

/**
 * Labeled field wrapper for custom controls (e.g. time input).
 */
export function SettingsUnderlineField({ label, children }: SettingsUnderlineFieldProps) {
  return (
    <div className="space-y-2">
      <label className="settings-field-label block">{label}</label>
      {children}
    </div>
  )
}

interface SettingsUnderlineInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

/**
 * Text/email/date/password input with underline styling.
 */
export function SettingsUnderlineInput({ label, className = '', ...props }: SettingsUnderlineInputProps) {
  return (
    <SettingsUnderlineField label={label}>
      <input className={`${fieldClassName} ${className}`.trim()} {...props} />
    </SettingsUnderlineField>
  )
}

interface SettingsUnderlineSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
}

/**
 * Select with underline styling (timezone, weekday, etc.).
 */
export function SettingsUnderlineSelect({
  label,
  options,
  className = '',
  ...props
}: SettingsUnderlineSelectProps) {
  return (
    <SettingsUnderlineField label={label}>
      <select
        className={`${fieldClassName} cursor-pointer appearance-none ${className}`.trim()}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </SettingsUnderlineField>
  )
}
