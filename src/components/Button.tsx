/* Button component: Reusable button with variants and responsive styling */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  /**
   * Optional fixed size; when omitted, button uses responsive sizing by breakpoint.
   * Responsive default: mobile (< 768px) → tablet (md) → desktop (lg).
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable button component with consistent styling and variants.
 * Responsive by default (Tailwind breakpoints); optional size override when fixed size is needed.
 */
export function Button({
  children,
  variant = 'primary',
  size,
  className = '',
  ...props
}: ButtonProps) {
  /* Base button classes: Rounded, transitions, focus, disabled */
  const baseClasses =
    'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  /* Variant-specific classes (Bonsai palette: sage primary, slate neutrals) */
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

  /* Responsive size: mobile → md (tablet) → lg (desktop) when size prop is omitted */
  const responsiveSizeClasses = 'px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base lg:px-6 lg:py-3 lg:text-lg'
  /* Fixed size overrides when size prop is provided */
  const fixedSizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const sizeClasses = size ? fixedSizeClasses[size] : responsiveSizeClasses
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${className}`

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
