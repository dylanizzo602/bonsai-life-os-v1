/* Button component: Reusable button with variants and responsive styling */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable button component with consistent styling and variants
 * Supports primary, secondary, danger, and ghost styles
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  // Base button classes
  const baseClasses =
    'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  // Variant-specific classes (Bonsai palette: sage primary, slate neutrals)
  const variantClasses = {
    primary:
      'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700 focus:ring-bonsai-sage-500 active:bg-bonsai-sage-700',
    secondary:
      'bg-bonsai-slate-200 text-bonsai-slate-700 hover:bg-bonsai-slate-300 focus:ring-bonsai-slate-400 active:bg-bonsai-slate-400',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    ghost:
      'bg-transparent text-bonsai-slate-700 hover:bg-bonsai-slate-100 focus:ring-bonsai-slate-400 active:bg-bonsai-slate-200',
  }

  // Size-specific classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
