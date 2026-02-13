/* AddButton component: Add button with optional dropdown; chevron flips when open */
import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from './icons'

interface AddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button text content */
  children: ReactNode
  /**
   * Optional fixed size; when omitted, button uses responsive sizing by breakpoint.
   * Responsive default: mobile (< 768px) → tablet (md) → desktop (lg).
   */
  size?: 'mobile' | 'tablet' | 'desktop'
  /**
   * Optional dropdown content. When provided, clicking the chevron toggles a popover
   * below the button (right-aligned). Chevron shows down when closed, up when open.
   */
  dropdownContent?: ReactNode
}

/**
 * Add button with main section (plus + text) and arrow section.
 * Optional dropdown variant: pass dropdownContent to show a right-aligned popover
 * below the button when the chevron is clicked; chevron flips to up when open.
 */
export function AddButton({
  children,
  size,
  className = '',
  dropdownContent,
  ...props
}: AddButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  /* Close dropdown when clicking outside the button or popover */
  useEffect(() => {
    if (!dropdownContent || !isDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownContent, isDropdownOpen])

  /* Shared layout: rounded-full, flex, two sections */
  const wrapperClasses =
    'inline-flex items-stretch font-medium rounded-full overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-white focus:ring-bonsai-sage-500'

  const responsiveSizeClasses = 'h-8 md:h-10 lg:h-12'
  const fixedSizeClasses = {
    mobile: 'h-8',
    tablet: 'h-10',
    desktop: 'h-12',
  }
  const heightClasses = size ? fixedSizeClasses[size] : responsiveSizeClasses

  /* Main section (left): plus + text; darkens on hover; body typography per branding */
  const responsiveMainClasses =
    'inline-flex items-center gap-1.5 pl-3 pr-2 md:gap-2 md:pl-4 md:pr-2.5 lg:gap-2.5 lg:pl-6 lg:pr-3 text-body bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors'
  const fixedMainClasses = {
    mobile:
      'inline-flex items-center gap-1.5 pl-3 pr-2 text-sm bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors',
    tablet:
      'inline-flex items-center gap-2 pl-4 pr-2.5 text-base bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors',
    desktop:
      'inline-flex items-center gap-2.5 pl-6 pr-3 text-lg bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors',
  }
  const mainClasses = size ? fixedMainClasses[size] : responsiveMainClasses

  /* Arrow section (right): same bg, darkens on hover; when dropdown variant, toggles popover */
  const responsiveArrowClasses =
    'inline-flex items-center justify-center px-2 md:px-2.5 lg:px-3 bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors'
  const fixedArrowClasses = {
    mobile:
      'inline-flex items-center justify-center px-2 bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors',
    tablet:
      'inline-flex items-center justify-center px-2.5 bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors',
    desktop:
      'inline-flex items-center justify-center px-3 bg-bonsai-sage-600 hover:bg-bonsai-sage-700 active:bg-bonsai-sage-700 transition-colors',
  }
  const arrowSectionClasses = size ? fixedArrowClasses[size] : responsiveArrowClasses

  /* Icon sizes: responsive or fixed */
  const responsiveIconClasses = 'w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6'
  const fixedIconClasses = {
    mobile: 'w-4 h-4',
    tablet: 'w-5 h-5',
    desktop: 'w-6 h-6',
  }
  const iconClasses = size ? fixedIconClasses[size] : responsiveIconClasses

  const baseClasses = `${wrapperClasses} ${heightClasses} ${className}`

  /* Dropdown variant: no overflow-hidden so popover can show; use rounded-l/r-full for pill shape */
  const dropdownGroupClasses =
    'inline-flex items-stretch font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-white focus:ring-bonsai-sage-500 rounded-full'

  if (dropdownContent != null) {
    return (
      <div ref={wrapperRef} className="relative inline-flex w-fit">
        <div className={`${dropdownGroupClasses} ${heightClasses} ${className}`} role="group">
          <button
            type="button"
            className={`${mainClasses} rounded-l-full`}
            {...props}
          >
            <PlusIcon className={iconClasses} />
            <span>{children}</span>
          </button>
          <button
            type="button"
            className={`${arrowSectionClasses} rounded-r-full`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            aria-label={isDropdownOpen ? 'Close menu' : 'Open menu'}
          >
            {isDropdownOpen ? (
              <ChevronUpIcon className={iconClasses} />
            ) : (
              <ChevronDownIcon className={iconClasses} />
            )}
          </button>
        </div>
        {/* Popover: right-aligned to the end of the full button */}
        {isDropdownOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-bonsai-slate-200 bg-white shadow-lg"
            role="menu"
          >
            <div className="px-2 py-1.5 text-right">{dropdownContent}</div>
          </div>
        )}
      </div>
    )
  }

  /* Default: single button (no dropdown) */
  return (
    <button className={baseClasses} {...props}>
      <span className={mainClasses}>
        <PlusIcon className={iconClasses} />
        <span>{children}</span>
      </span>
      <span className={arrowSectionClasses} aria-hidden>
        <ChevronDownIcon className={iconClasses} />
      </span>
    </button>
  )
}
