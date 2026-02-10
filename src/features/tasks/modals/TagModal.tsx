/* TagModal: Single tag input for task */

import { useState, useEffect } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'

export interface TagModalProps {
  isOpen: boolean
  onClose: () => void
  value: string | null
  onSave: (tag: string | null) => void
}

export function TagModal({ isOpen, onClose, value, onSave }: TagModalProps) {
  const [tag, setTag] = useState(value ?? '')

  useEffect(() => {
    if (isOpen) setTag(value ?? '')
  }, [isOpen, value])

  const handleSave = () => {
    const t = tag.trim()
    onSave(t || null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add tag"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <Input
        placeholder="Tag name"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
    </Modal>
  )
}
