-- Add is_later field to tasks table for focus/later functionality
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_later BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_is_later ON tasks(is_later);

-- Add comment
COMMENT ON COLUMN tasks.is_later IS 'Whether this task is in the "Later" section (not in Today''s Focus)';
