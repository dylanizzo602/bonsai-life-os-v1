-- Migration: Allow task status 'in_progress' in addition to 'active' and 'completed'
-- Enables UI to persist and display OPEN / IN PROGRESS / COMPLETE correctly

-- Drop existing check constraint and add new one that includes in_progress
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check,
  ADD CONSTRAINT tasks_status_check CHECK (status IN ('active', 'in_progress', 'completed'));
