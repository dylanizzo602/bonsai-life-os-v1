/* TimeEstimateModal: Set task time estimate in minutes */

import { useState, useEffect } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'

export interface TimeEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  minutes: number | null
  onSave: (minutes: number | null) => void
}

const PRESETS = [15, 30, 45, 60, 90, 120]

export function TimeEstimateModal({
  isOpen,
  onClose,
  minutes,
  onSave,
}: TimeEstimateModalProps) {
  const [value, setValue] = useState(minutes ?? '')

  useEffect(() => {
    if (isOpen) setValue(minutes != null ? String(minutes) : '')
  }, [isOpen, minutes])

  const handleSave = () => {
    const n = value === '' ? null : parseInt(String(value), 10)
    if (n !== null && (Number.isNaN(n) || n < 0)) {
      onSave(null)
    } else {
      onSave(n)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Time estimate"
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
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-bonsai-slate-700 mb-1">
            Minutes
          </label>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 30"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-bonsai-slate-700 mb-2">Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue(String(m))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  value === String(m)
                    ? 'bg-bonsai-sage-600 text-white'
                    : 'bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
