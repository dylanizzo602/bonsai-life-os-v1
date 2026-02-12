/* TruncatedText component: Shows tooltip only when text is truncated */
import { useRef, useState, useEffect } from 'react'
import { Tooltip } from './Tooltip'
import type { ReactNode, CSSProperties } from 'react'

interface TruncatedTextProps {
  /** Text content to display */
  children: ReactNode
  /** Full text to show in tooltip (if different from children) */
  fullText?: string
  /** Additional CSS classes */
  className?: string
  /** Inline styles */
  style?: CSSProperties
  /** Position of tooltip relative to text */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Component that displays text and shows a tooltip with full text only when the text is truncated.
 * Detects truncation by comparing scrollWidth to clientWidth.
 */
export function TruncatedText({
  children,
  fullText,
  className = '',
  style,
  tooltipPosition = 'bottom',
}: TruncatedTextProps) {
  /* Element reference: Used to detect if text is truncated */
  const textRef = useRef<HTMLSpanElement>(null)
  /* State: Track whether text is truncated */
  const [isTruncated, setIsTruncated] = useState(false)

  /* Truncation detection: Check if text overflows its container using ResizeObserver */
  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const checkTruncation = () => {
      /* Create a temporary element to measure the full text width */
      const text = typeof children === 'string' ? children : String(children)
      if (!text) {
        setIsTruncated(false)
        return
      }

      /* Get computed styles from the element */
      const styles = window.getComputedStyle(element)
      
      /* Create temporary element with same styles to measure full text width */
      const temp = document.createElement('span')
      temp.style.visibility = 'hidden'
      temp.style.position = 'absolute'
      temp.style.whiteSpace = 'nowrap'
      temp.style.fontSize = styles.fontSize
      temp.style.fontFamily = styles.fontFamily
      temp.style.fontWeight = styles.fontWeight
      temp.style.fontStyle = styles.fontStyle
      temp.style.letterSpacing = styles.letterSpacing
      temp.style.textTransform = styles.textTransform
      temp.style.paddingLeft = styles.paddingLeft
      temp.style.paddingRight = styles.paddingRight
      temp.textContent = text
      document.body.appendChild(temp)
      
      const fullWidth = temp.offsetWidth
      document.body.removeChild(temp)
      
      /* Get the actual visible width of the element */
      const visibleWidth = element.clientWidth
      
      /* Also check scrollWidth vs clientWidth as a backup method */
      const isOverflowing = element.scrollWidth > element.clientWidth
      
      /* Text is truncated if full width exceeds visible width OR if scrollWidth > clientWidth */
      const truncated = fullWidth > visibleWidth + 1 || isOverflowing
      setIsTruncated(truncated)
    }

    /* Initial check: Use multiple requestAnimationFrame calls to ensure DOM is ready */
    let rafId1: number
    let rafId2: number
    
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        checkTruncation()
      })
    })

    /* Use ResizeObserver for accurate detection when element size changes */
    const resizeObserver = new ResizeObserver(() => {
      /* Small delay to ensure styles are applied */
      setTimeout(checkTruncation, 0)
    })
    resizeObserver.observe(element)

    /* Also listen to window resize for viewport changes */
    window.addEventListener('resize', checkTruncation)

    return () => {
      cancelAnimationFrame(rafId1)
      if (rafId2) cancelAnimationFrame(rafId2)
      resizeObserver.disconnect()
      window.removeEventListener('resize', checkTruncation)
    }
  }, [children, style])

  /* Determine tooltip content: Use fullText prop if provided, otherwise use children */
  const tooltipContent = fullText ?? (typeof children === 'string' ? children : String(children))

  /* Render: Always wrap with Tooltip but only show when truncated */
  /* Ensure truncation styles are applied: overflow hidden, text-overflow ellipsis, white-space nowrap */
  /* In flex containers, ensure maxWidth is respected and element can shrink but not grow beyond maxWidth */
  const computedStyle: CSSProperties = {
    ...style,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0, // Allow element to shrink in flex containers
    flexShrink: 1, // Allow flex shrinking
    flexGrow: 0, // Prevent flex growing beyond maxWidth
    // Block display ensures maxWidth constraint is respected in flex containers
    display: style?.maxWidth ? 'block' : 'inline-block',
  }

  return (
    <Tooltip 
      content={isTruncated ? tooltipContent : ''} 
      position={tooltipPosition}
    >
      <span 
        ref={textRef} 
        className={className} 
        style={computedStyle}
      >
        {children}
      </span>
    </Tooltip>
  )
}
