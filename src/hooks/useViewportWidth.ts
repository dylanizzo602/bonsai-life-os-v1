/* Viewport width hook: Detects viewport width and provides responsive breakpoint detection */
import { useState, useEffect } from 'react'

/**
 * Custom hook for detecting viewport width
 * Tracks window width and provides utilities for responsive breakpoint detection
 */
export function useViewportWidth() {
  /* State management: Track current viewport width */
  const [width, setWidth] = useState<number>(() => {
    /* Initial width: Get window width on mount (handles SSR) */
    if (typeof window !== 'undefined') {
      return window.innerWidth
    }
    return 0
  })

  /* Effect: Listen for window resize events and update width */
  useEffect(() => {
    /* Resize handler: Update width state when window resizes */
    const handleResize = () => {
      setWidth(window.innerWidth)
    }

    /* Event listener setup: Add resize listener */
    window.addEventListener('resize', handleResize)

    /* Cleanup: Remove resize listener on unmount */
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return width
}
