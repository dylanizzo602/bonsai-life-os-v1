/* Hamburger menu: Mobile/tablet navigation toggle button */
import { HamburgerIcon } from '../../../components/icons'

interface HamburgerMenuProps {
  /** Callback when hamburger menu is clicked */
  onClick: () => void
}

/**
 * Hamburger menu button component
 * Displays three horizontal lines icon for toggling mobile navigation
 */
export function HamburgerMenu({ onClick }: HamburgerMenuProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-bonsai-slate-500 hover:text-bonsai-slate-700 hover:bg-bonsai-slate-100 rounded-lg transition-colors lg:hidden"
      aria-label="Open navigation menu"
      aria-expanded="false"
    >
      <HamburgerIcon className="w-6 h-6" />
    </button>
  )
}
