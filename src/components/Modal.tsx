/* Modal component: Reusable modal/dialog component for forms and content */
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to call when modal should close */
  onClose: () => void
  /** Modal title (string or ReactNode for custom content) */
  title?: string | ReactNode
  /** Optional fully custom header (replaces default title + close button layout) */
  header?: ReactNode
  /** Modal content */
  children: ReactNode
  /** Optional footer content */
  footer?: ReactNode
  /** When true, render only backdrop + children (no outer card). Use when children are a single popover box. */
  noCard?: boolean
  /** When true, modal is full-screen on mobile (< 768px), centered with max-width on tablet/desktop */
  fullScreenOnMobile?: boolean
  /** When true, modal body grows to fit content without its own scroll; page scrolls instead if needed */
  disableBodyScroll?: boolean
  /** Optional extra classes for the backdrop/overlay container */
  overlayClassName?: string
  /** Optional extra classes for the modal card */
  cardClassName?: string
  /** Optional extra classes for the default header wrapper */
  headerClassName?: string
  /** Optional extra classes for the modal body wrapper */
  bodyClassName?: string
  /** Optional extra classes for the footer wrapper */
  footerClassName?: string
}

/**
 * Reusable modal component with backdrop and close functionality.
 * Supports ESC key to close and click outside to close; optionally disables internal body scrolling so height fits content.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  header,
  children,
  footer,
  noCard = false,
  fullScreenOnMobile = false,
  disableBodyScroll = false,
  overlayClassName = '',
  cardClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
}: ModalProps) {
  /* Close modal on ESC key press */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  /* Bare mode: only backdrop + children (no outer card). Child is the only visible box. */
  if (noCard) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-bonsai-slate-900/30 p-4 md:p-6"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl flex justify-center">
          {children}
        </div>
      </div>
    )
  }

  /* Full-screen on mobile: no padding, modal fills viewport; on md+ use centered card */
  const containerClass = fullScreenOnMobile
    ? 'fixed inset-0 z-50 flex justify-center bg-bonsai-slate-900/30 p-0 md:p-6 items-stretch md:items-center'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-bonsai-slate-900/30 p-4 md:p-6'
  const cardClass = fullScreenOnMobile
    ? 'bg-white shadow-xl w-full min-h-full md:min-h-0 md:max-h-[90vh] md:max-w-2xl md:rounded-lg rounded-none overflow-hidden flex flex-col'
    : 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col'
  /* Body layout: always flex-1 so full-screen modals fill the viewport; toggle scrolling via disableBodyScroll */
  const bodyClass = disableBodyScroll
    ? 'flex-1 min-h-0 overflow-hidden p-4 md:p-5 lg:p-6'
    : 'flex-1 min-h-0 overflow-y-auto p-4 md:p-5 lg:p-6'

  return (
    <div className={`${containerClass} ${overlayClassName}`} onClick={onClose}>
      <div className={`${cardClass} ${cardClassName}`} onClick={(e) => e.stopPropagation()}>
        {/* Header: custom header overrides default title/close layout */}
        {header != null ? (
          <div className={headerClassName}>{header}</div>
        ) : title ? (
          <div
            className={`flex items-center justify-between p-4 md:p-5 lg:p-6 border-b border-bonsai-slate-200 ${headerClassName}`}
          >
            {typeof title === 'string' ? (
              <h2 className="text-body font-semibold text-bonsai-brown-700">{title}</h2>
            ) : (
              <div className="text-body font-semibold text-bonsai-brown-700">{title}</div>
            )}
            <button
              onClick={onClose}
              className="text-bonsai-slate-400 hover:text-bonsai-slate-600 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 rounded p-1"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : null}

        <div className={`${bodyClass} ${bodyClassName}`}>{children}</div>

        {footer && (
          <div
            className={`border-t border-bonsai-slate-200 p-4 md:p-5 lg:p-6 flex justify-end gap-2 ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
