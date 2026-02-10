/* Modal component: Reusable modal/dialog component for forms and content */
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to call when modal should close */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal content */
  children: ReactNode
  /** Optional footer content */
  footer?: ReactNode
}

/**
 * Reusable modal component with backdrop and close functionality
 * Supports ESC key to close and click outside to close
 */
export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  // Close modal on ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Modal content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* Modal footer */}
        {footer && (
          <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
