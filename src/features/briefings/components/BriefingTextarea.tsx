/* BriefingTextarea: Plain multiline input for reflection prompts */

interface BriefingTextareaProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  /** centered = gratitude-style; default = left-aligned card */
  variant?: 'default' | 'minimal' | 'centered'
  className?: string
}

/**
 * Plain textarea for briefing reflections (no rich-text toolbar).
 */
export function BriefingTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  variant = 'default',
  className = '',
}: BriefingTextareaProps) {
  const variantClasses = {
    default:
      'w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 text-body text-on-surface placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
    minimal:
      'w-full resize-none border-0 border-b-2 border-outline-variant bg-transparent pb-4 text-body text-on-surface-variant placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-0',
    centered:
      'w-full resize-none border-0 border-b border-outline-variant bg-transparent py-4 text-center text-body text-on-surface-variant placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-0 md:text-lg',
  }

  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${variantClasses[variant]} ${className}`}
    />
  )
}
