/* useCompactTopNav: Switch to mobile header when center nav would clip brand or utilities */

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Minimum horizontal gap between brand, nav, and utility icons */
const MIN_NAV_GAP_PX = 16

interface UseCompactTopNavResult {
  headerRef: RefObject<HTMLElement | null>
  brandRef: RefObject<HTMLDivElement | null>
  navMeasureRef: RefObject<HTMLElement | null>
  utilitiesRef: RefObject<HTMLDivElement | null>
  isCompact: boolean
}

/**
 * Detects when the centered nav links would overlap the logo or right-side icons.
 * Returns isCompact=true so TopNav can show the hamburger menu instead of center links.
 */
export function useCompactTopNav(navItemCount: number): UseCompactTopNavResult {
  const headerRef = useRef<HTMLElement | null>(null)
  const brandRef = useRef<HTMLDivElement | null>(null)
  const navMeasureRef = useRef<HTMLElement | null>(null)
  const utilitiesRef = useRef<HTMLDivElement | null>(null)
  const [isCompact, setIsCompact] = useState(false)

  /* Fit check: compare measured nav width to space between brand and utilities */
  const evaluateCompactLayout = useCallback(() => {
    const brand = brandRef.current
    const nav = navMeasureRef.current
    const utilities = utilitiesRef.current

    if (!brand || !nav || !utilities) return

    /* Below md: always use mobile header (CSS breakpoint baseline) */
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsCompact(true)
      return
    }

    const brandRect = brand.getBoundingClientRect()
    const utilitiesRect = utilities.getBoundingClientRect()
    const navWidth = nav.offsetWidth
    const availableWidth = utilitiesRect.left - brandRect.right - MIN_NAV_GAP_PX * 2

    setIsCompact(navWidth > availableWidth)
  }, [navItemCount])

  /* Observe header layout changes (resize, font load, dev nav items) */
  useLayoutEffect(() => {
    evaluateCompactLayout()

    const resizeObserver = new ResizeObserver(() => {
      evaluateCompactLayout()
    })

    const observedElements = [
      headerRef.current,
      brandRef.current,
      navMeasureRef.current,
      utilitiesRef.current,
    ].filter((element): element is HTMLElement => element != null)

    for (const element of observedElements) {
      resizeObserver.observe(element)
    }

    window.addEventListener('resize', evaluateCompactLayout)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', evaluateCompactLayout)
    }
  }, [evaluateCompactLayout])

  return { headerRef, brandRef, navMeasureRef, utilitiesRef, isCompact }
}
