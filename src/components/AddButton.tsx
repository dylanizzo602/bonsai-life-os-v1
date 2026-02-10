/* AddButton component: Add button with dropdown arrow, responsive width and fixed height */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { PlusIcon, ChevronDownIcon } from './icons'

interface AddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button text content */
  children: ReactNode
  /**
   * Optional fixed size; when omitted, button uses responsive sizing by breakpoint.
   * Responsive default: mobile (< 768px) → tablet (md) → desktop (lg).
   */
  size?: 'mobile' | 'tablet' | 'desktop'
}

/**
 * Add button component with dropdown arrow indicator
 * Features:
 * - Responsive by default: fixed height and scale follow viewport (mobile → md → lg)
 * - Optional size prop to lock a fixed size
 * - Width responsive to text content
 * - Plus icon left, text center, chevron-down right; rounded-full; primary green
 */
export function AddButton({
  children,
  size,
  className = '',
  ...props
}: AddButtonProps) {
  /* Base button classes: Rounded-full, flex layout, transitions, a11y */
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'

  /* Variant classes: Primary green background with white text/icons, hover states */
  const variantClasses =
    'bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700 focus:ring-bonsai-sage-500 active:bg-bonsai-sage-700'

  /* Responsive size classes: Mobile-first, then md (tablet), lg (desktop) */
  const responsiveSizeClasses =
    'h-8 px-3 text-sm gap-1.5 md:h-10 md:px-4 md:text-base md:gap-2 lg:h-12 lg:px-6 lg:text-lg lg:gap-2.5'

  /* Fixed size overrides: Used only when size prop is set */
  const fixedSizeClasses = {
    mobile: 'h-8 px-3 text-sm gap-1.5',
    tablet: 'h-10 px-4 text-base gap-2',
    desktop: 'h-12 px-6 text-lg gap-2.5',
  }

  /* Icon sizes: Responsive by default, or fixed when size prop is set */
  const responsiveIconClasses = 'w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6'
  const fixedIconClasses = {
    mobile: 'w-4 h-4',
    tablet: 'w-5 h-5',
    desktop: 'w-6 h-6',
  }

  const sizeClasses = size ? fixedSizeClasses[size] : responsiveSizeClasses
  const iconClasses = size ? fixedIconClasses[size] : responsiveIconClasses
  const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`

  return (
    <button className={classes} {...props}>
      {/* Plus icon: Left side indicator for add/create action */}
      <PlusIcon className={iconClasses} />
      {/* Button text: Center content, width responsive to text */}
      <span>{children}</span>
      {/* Chevron down icon: Right side indicator for dropdown */}
      <ChevronDownIcon className={iconClasses} />
    </button>
  )
}
