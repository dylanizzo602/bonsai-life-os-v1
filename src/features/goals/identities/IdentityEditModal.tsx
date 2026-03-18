/* IdentityEditModal: edit identity name + description text */

import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'

export interface IdentityEditModalProps {
  isOpen: boolean
  onClose: () => void
  identityName: string
  identityDescription: string
  onSave: (input: { name: string; description: string }) => Promise<void>
}

/**
 * Modal for editing the identity's display name and the description shown on badge flip.
 */
export function IdentityEditModal({
  isOpen,
  onClose,
  identityName,
  identityDescription,
  onSave,
}: IdentityEditModalProps) {
  const [name, setName] = useState(identityName)
  const [description, setDescription] = useState(identityDescription)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setName(identityName)
    setDescription(identityDescription)
    setError(null)
  }, [isOpen, identityName, identityDescription])

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (!trimmedDescription) {
      setError('Description is required.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await onSave({ name: trimmedName, description: trimmedDescription })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save identity.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const titleNode = (
    <div>
      <h2 className="text-body font-semibold text-bonsai-brown-700">Edit identity</h2>
      <p className="text-secondary text-bonsai-slate-500 mt-0.5">Update name and description text.</p>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      fullScreenOnMobile
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={submitting}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Identity name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Health"
        />

        <div>
          <label className="block text-secondary font-medium text-bonsai-slate-700 mb-1">
            Identity description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-bonsai-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:border-transparent text-body"
            placeholder="What does this identity mean?"
          />
          {error && <p className="mt-2 text-secondary text-red-600">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}

