-- Migration: Add recurrence_pattern to reminders table for recurring reminders
-- Stores JSON string for recurrence configuration (same format as tasks.recurrence_pattern)

ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
