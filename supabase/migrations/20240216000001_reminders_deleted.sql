-- Migration: Add soft-delete support for reminders (hidden by default; show when "Show deleted" is on)
-- "Closed" = completed (existing). Deleted reminders are hidden until toggled.

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reminders_deleted ON reminders(deleted) WHERE deleted = FALSE;
