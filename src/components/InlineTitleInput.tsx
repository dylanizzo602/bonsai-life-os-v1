/* InlineTitleInput: In-place text input for editing a name/title; Save button + Enter to save, Cancel/Escape to cancel */

import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

export interface InlineTitleInputProps {
  /** Current value (e.g. task title or reminder name) */
  value: string
  /** Called with trimmed new value to save */
  onSave: (newTitle: string) => void | Promise<void>
  /** Called to cancel without saving */
  onCancel: () => void
  /** Optional class name for the input */
  className?: string
  /** Optional aria-label for the input */
  'aria-label'?: string
}

/**
 * Inline text input for editing a name in place.
 * Shows input + Save and Cancel buttons. Saves on Save button click or Enter; cancels on Cancel or Escape.
 * Focuses and selects on mount; blur still saves if changed (so tabbing out saves).
 */
export function InlineTitleInput({
  value,
  onSave,
  onCancel,
  className,
  'aria-label': ariaLabel = 'Edit name',
}: InlineTitleInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  /* Sync local value when prop value changes (e.g. entering edit mode) */
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  /* Focus and select input when mounted */
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSave = () => {
    const trimmed = localValue.trim()
    if (trimmed === '') {
      onCancel()
      return
    }
    if (trimmed !== value) {
      void Promise.resolve(onSave(trimmed))
    } else {
      onCancel()
    }
  }

  const handleBlur = () => {
    handleSave()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`min-w-0 flex-1 ${className ?? ''}`}
        aria-label={ariaLabel}
      />
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleSave()
          }}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
