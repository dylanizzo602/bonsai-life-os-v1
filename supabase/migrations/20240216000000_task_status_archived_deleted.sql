-- Migration: Allow task status 'archived' and 'deleted' for soft archive/delete
-- Closed = completed (existing). Archived and deleted tasks are hidden by default and shown via toggles.

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check,
  ADD CONSTRAINT tasks_status_check CHECK (status IN ('active', 'in_progress', 'completed', 'archived', 'deleted'));
