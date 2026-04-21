-- Migration: Add additional habit reminder offsets (minutes)
-- Purpose: Allow multiple habit notifications relative to the primary reminder time.

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS additional_reminder_offsets_mins INT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN habits.additional_reminder_offsets_mins IS
  'Additional habit reminder offsets in minutes relative to the primary reminder time (negative=before, positive=after).';
