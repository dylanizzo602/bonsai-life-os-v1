-- Migration: Add monthly habit frequency configuration
-- Adds: habits.monthly_interval, habits.monthly_day
-- Updates: habits.frequency check constraint to include 'monthly'

/* Schema update: add monthly configuration columns with safe defaults */
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS monthly_interval INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monthly_day INT NOT NULL DEFAULT 1;

/* Data normalization: ensure existing rows have non-null values */
UPDATE habits
SET
  monthly_interval = COALESCE(monthly_interval, 1),
  monthly_day = COALESCE(monthly_day, 1)
WHERE monthly_interval IS NULL OR monthly_day IS NULL;

/* Constraint update: expand allowed frequency values to include monthly */
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_frequency_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'times_per_day', 'every_x_days'));
