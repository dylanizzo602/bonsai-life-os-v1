/* EditorToolbarDropdown: Accessible dropdown menu for rich text toolbar controls */

import { useEffect, useId, useRef, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'

export interface EditorToolbarMenuItem {
  id: string
  label: string
  icon?: string
  active?: boolean
  onSelect: () => void
}

interface EditorToolbarDropdownProps {
  /** Button label shown when closed (hidden when showLabel is false) */
  label: string
  /** Optional leading icon on the trigger */
  triggerIcon?: string
  /** When false, only the icon and chevron are shown on the trigger */
  showLabel?: boolean
  items: EditorToolbarMenuItem[]
  /** Whether any item in the group is active */
  isActive?: boolean
  /** Toolbar button classes */
  btnClass: string
  btnActiveClass: string
  ariaLabel: string
}

/**
 * Compact toolbar dropdown with click-outside close behavior.
 */
export function EditorToolbarDropdown({
  label,
  triggerIcon,
  showLabel = true,
  items,
  isActive = false,
  btnClass,
  btnActiveClass,
  ariaLabel,
}: EditorToolbarDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  /* Close menu when clicking outside */
  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const triggerLabel = (
    <>
      {triggerIcon && <MaterialIcon name={triggerIcon} className="text-lg" />}
      {showLabel && (
        <span className="max-w-[7rem] truncate text-sm font-medium">{label}</span>
      )}
      <MaterialIcon name="expand_more" className="text-base" />
    </>
  )

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className={`${btnClass} ${isActive ? btnActiveClass : ''} flex items-center gap-1 px-2`}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container ${
                item.active ? 'font-semibold text-primary' : 'text-on-surface'
              }`}
            >
              {item.icon && <MaterialIcon name={item.icon} className="text-base" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface EditorToolbarSplitButtonProps {
  icon: string
  title: string
  active?: boolean
  onPrimaryClick: () => void
  items: EditorToolbarMenuItem[]
  btnClass: string
  btnActiveClass: string
}

/**
 * Split button: primary icon action + chevron dropdown for alternate list styles.
 */
export function EditorToolbarSplitButton({
  icon,
  title,
  active = false,
  onPrimaryClick,
  items,
  btnClass,
  btnActiveClass,
}: EditorToolbarSplitButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative flex items-center" ref={rootRef}>
      <button
        type="button"
        title={title}
        aria-pressed={active}
        onClick={onPrimaryClick}
        className={`${btnClass} ${active ? btnActiveClass : ''} rounded-r-none pr-1.5`}
      >
        <MaterialIcon name={icon} className="text-lg" />
      </button>
      <button
        type="button"
        aria-label={`${title} options`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className={`${btnClass} rounded-l-none pl-0.5 pr-1.5`}
      >
        <MaterialIcon name="expand_more" className="text-base" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container ${
                item.active ? 'font-semibold text-primary' : 'text-on-surface'
              }`}
            >
              {item.icon && <MaterialIcon name={item.icon} className="text-base" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Vertical divider between toolbar control groups */
export function ToolbarDivider({ className }: { className: string }) {
  return <span className={className} aria-hidden />
}

/** Icon-only toolbar button */
export function ToolbarIconButton({
  icon,
  title,
  active,
  onClick,
  btnClass,
  btnActiveClass,
  className = '',
}: {
  icon: string
  title: string
  active?: boolean
  onClick: () => void
  btnClass: string
  btnActiveClass: string
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`${btnClass} ${active ? btnActiveClass : ''} ${className}`}
    >
      <MaterialIcon name={icon} className="text-lg" />
    </button>
  )
}

/** Save status indicator for reflection editor */
export function ToolbarSaveStatus({
  saveStatus,
}: {
  saveStatus: 'idle' | 'saving' | 'saved'
}) {
  const saveLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved to cloud' : ''

  if (!saveLabel) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-outline">{saveLabel}</span>
      <MaterialIcon
        name="cloud_done"
        className="text-sm text-primary"
        filled={saveStatus === 'saved'}
      />
    </div>
  )
}
