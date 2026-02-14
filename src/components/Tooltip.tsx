/* Tooltip component: Reusable hover tooltip that can contain any content */
import React, { type ReactNode } from 'react'
import { useState, useRef, useEffect } from 'react'

/** Desktop breakpoint (lg): tooltips only on viewport >= 1024px; no tooltips on tablet, mobile, or compact */
const TOOLTIP_MEDIA_QUERY = '(min-width: 1024px)'

interface TooltipProps {
  /** Content to display inside the tooltip (can be modals, components, text, etc.) */
  content: ReactNode
  /** Element that triggers the tooltip on hover */
  children: ReactNode
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Optional fixed size; when omitted, tooltip uses responsive sizing */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

/**
 * Reusable tooltip component that displays content on hover.
 * Tooltips are disabled on tablet, mobile, and compact views (viewport < 1024px).
 * Can contain any React content including modals and other components.
 * Responsive by default (Tailwind breakpoints); optional size override when fixed size is needed.
 */
export function Tooltip({
  content,
  children,
  position = 'bottom',
  size,
  className = '',
}: TooltipProps) {
  /* State management: Track hover state and tooltip position */
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  /* Viewport check: Only enable hover tooltips on desktop (lg: >= 1024px); none on tablet/mobile/compact */
  const [tooltipsEnabled, setTooltipsEnabled] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(TOOLTIP_MEDIA_QUERY).matches : false
  )
  useEffect(() => {
    const mql = window.matchMedia(TOOLTIP_MEDIA_QUERY)
    const handler = () => {
      setTooltipsEnabled(mql.matches)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  /* Position calculation: Calculate tooltip position relative to trigger element */
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return

    /* Use requestAnimationFrame to ensure DOM is updated before calculating position */
    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return

      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = triggerRect.top + scrollY - tooltipRect.height - 8
          left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'bottom':
          top = triggerRect.bottom + scrollY + 8
          left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'left':
          top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.left + scrollX - tooltipRect.width - 8
          break
        case 'right':
          top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.right + scrollX + 8
          break
      }

      /* Boundary adjustment: Keep tooltip within viewport */
      const padding = 8
      const maxLeft = scrollX + window.innerWidth - tooltipRect.width - padding
      const maxTop = scrollY + window.innerHeight - tooltipRect.height - padding
      const minLeft = scrollX + padding
      const minTop = scrollY + padding

      left = Math.max(minLeft, Math.min(maxLeft, left))
      top = Math.max(minTop, Math.min(maxTop, top))

      setTooltipPosition({ top, left })
    }

    /* Delay position calculation to ensure tooltip is rendered */
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition)
    })
  }, [isVisible, position])

  /* Responsive padding: Mobile → tablet → desktop when size prop is omitted */
  const responsivePaddingClasses = 'px-3 py-2 md:px-4 md:py-2.5 lg:px-5 lg:py-3'
  /* Fixed padding overrides when size prop is provided */
  const fixedPaddingClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-2.5',
    lg: 'px-5 py-3',
  }
  const paddingClasses = size ? fixedPaddingClasses[size] : responsivePaddingClasses

  /* Arrow positioning: CSS classes for arrow based on position with border matching tooltip */
  const arrowClasses = {
    top: 'bottom-[-8px] left-1/2 -translate-x-1/2',
    bottom: 'top-[-8px] left-1/2 -translate-x-1/2',
    left: 'right-[-8px] top-1/2 -translate-y-1/2',
    right: 'left-[-8px] top-1/2 -translate-y-1/2',
  }
  
  /* Border classes: Remove border from the side where arrow appears to prevent overlap */
  const borderClasses = {
    top: 'border border-bonsai-slate-200 border-b-0', // Remove bottom border when arrow is at top
    bottom: 'border border-bonsai-slate-200 border-t-0', // Remove top border when arrow is at bottom
    left: 'border border-bonsai-slate-200 border-r-0', // Remove right border when arrow is at left
    right: 'border border-bonsai-slate-200 border-l-0', // Remove left border when arrow is at right
  }
  
  /* Arrow styles: Clean white fill without border - border removed from tooltip prevents overlap */
  const arrowStyles = {
    top: {
      borderTop: '8px solid white',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))',
    },
    bottom: {
      borderBottom: '8px solid white',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      filter: 'drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.1))',
    },
    left: {
      borderLeft: '8px solid white',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      filter: 'drop-shadow(-2px 0 2px rgba(0, 0, 0, 0.1))',
    },
    right: {
      borderRight: '8px solid white',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      filter: 'drop-shadow(2px 0 2px rgba(0, 0, 0, 0.1))',
    },
  }

  /* Helper function: Check if content is valid and non-empty */
  const hasValidContent = (): boolean => {
    if (!content) return false
    if (typeof content === 'string') {
      return content.trim().length > 0
    }
    /* For ReactNode: null and undefined are considered empty (!content already caught false, 0, '') */
    if (content == null) return false
    /* If it's a React element, check if it has children or props that indicate content */
    if (React.isValidElement(content)) {
      const element = content as React.ReactElement<{ children?: ReactNode }>
      const propsChildren = element.props?.children
      if (propsChildren != null) {
        /* If children is an array, check if it has any non-empty items */
        if (Array.isArray(propsChildren)) {
          return propsChildren.some(
            (child: ReactNode) =>
              child != null && child !== false && child !== ''
          )
        }
        /* If children is a single item, check if it's not empty */
        return propsChildren !== false && propsChildren !== ''
      }
      /* If no children but element exists, consider it valid (might be self-closing with content) */
      return true
    }
    /* For other ReactNode types, consider valid if truthy */
    return true
  }

  /* Hide tooltip when switching to tablet/mobile/compact so no tooltip lingers */
  useEffect(() => {
    if (!tooltipsEnabled) setIsVisible(false)
  }, [tooltipsEnabled])

  /* Hover handlers: Show/hide tooltip on hover only on desktop; only if content is provided */
  const handleMouseEnter = () => {
    if (tooltipsEnabled && hasValidContent()) {
      setIsVisible(true)
    }
  }
  const handleMouseLeave = () => setIsVisible(false)

  return (
    <>
      {/* Trigger element: Wraps children and handles hover events */}
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-block', width: '100%' }}
      >
        {children}
      </span>

      {/* Tooltip container: Positioned absolutely, visible on hover, only render if content exists and is not empty */}
      {isVisible && hasValidContent() && (
        <div
          ref={tooltipRef}
          className={`fixed z-[9999] pointer-events-none ${className}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Tooltip content: White background, rounded corners, shadow, padding */}
          {/* Border is conditionally applied to exclude the side where arrow appears */}
          <div
            className={`bg-white rounded-lg shadow-lg ${borderClasses[position]} ${paddingClasses} pointer-events-auto`}
          >
            {content}
          </div>

          {/* Arrow pointer: Positioned based on tooltip position, styled to match tooltip */}
          {/* Clean white arrow without border - border removed from tooltip box prevents overlap */}
          <div
            className={`absolute ${arrowClasses[position]} w-0 h-0`}
            style={arrowStyles[position]}
          />
        </div>
      )}
    </>
  )
}
