-- Migration: Add desired_action and minimum_action to habits for Create Habit modal
-- desired_action = full/ideal action; minimum_action = minimum viable action (maps to Habits 1.1 "minimum" status)

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS desired_action TEXT,
  ADD COLUMN IF NOT EXISTS minimum_action TEXT;
