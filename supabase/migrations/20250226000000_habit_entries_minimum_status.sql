-- Migration: Allow 'minimum' status on habit_entries for Habits 1.1 (yellow = minimum viable action)
-- 1.0 treats minimum as completed for streak; 1.1 uses green=1, yellow=0.1, red=0

ALTER TABLE habit_entries
  DROP CONSTRAINT IF EXISTS habit_entries_status_check;

ALTER TABLE habit_entries
  ADD CONSTRAINT habit_entries_status_check
  CHECK (status IN ('completed', 'skipped', 'minimum'));
